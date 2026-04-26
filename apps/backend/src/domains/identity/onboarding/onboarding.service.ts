import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { OnboardingStep, Gender, BodyType as PrismaBodyType } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { CompleteBasicInfoDto } from "./dto/onboarding.dto";

const STEP_ORDER: OnboardingStep[] = [
  OnboardingStep.BASIC_INFO,
  OnboardingStep.PHOTO,
  OnboardingStep.STYLE_TEST,
  OnboardingStep.COMPLETED,
];

const STEP_PERCENTAGE: Record<OnboardingStep, number> = {
  [OnboardingStep.BASIC_INFO]: 0,
  [OnboardingStep.PHOTO]: 33,
  [OnboardingStep.STYLE_TEST]: 66,
  [OnboardingStep.COMPLETED]: 100,
};

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private prisma: PrismaService) {}

  async getOnboardingState(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("用户画像不存在");
    }

    const currentStep = profile.onboardingStep;
    const completedSteps: OnboardingStep[] = [];

    if (STEP_ORDER.indexOf(currentStep) > STEP_ORDER.indexOf(OnboardingStep.BASIC_INFO)) {
      completedSteps.push(OnboardingStep.BASIC_INFO);
    }
    if (STEP_ORDER.indexOf(currentStep) > STEP_ORDER.indexOf(OnboardingStep.PHOTO)) {
      completedSteps.push(OnboardingStep.PHOTO);
    }
    if (STEP_ORDER.indexOf(currentStep) > STEP_ORDER.indexOf(OnboardingStep.STYLE_TEST)) {
      completedSteps.push(OnboardingStep.STYLE_TEST);
    }

    return {
      currentStep,
      completedSteps,
    };
  }

  async completeBasicInfo(userId: string, dto: CompleteBasicInfoDto) {
    const [user, profile] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
    ]);

    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    if (!profile) {
      throw new NotFoundException("用户画像不存在");
    }

    if (profile.onboardingStep !== OnboardingStep.BASIC_INFO) {
      throw new BadRequestException("当前步骤不是基本信息填写");
    }

    const userUpdateData: Partial<{ gender: Gender }> = {};
    if (dto.gender) {
      userUpdateData.gender = dto.gender as Gender;
    }
    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        height: dto.height,
        weight: dto.weight,
        ...(dto.bodyType ? { bodyType: dto.bodyType as PrismaBodyType } : {}),
        ...(dto.primaryScenarios ? { primaryScenarios: dto.primaryScenarios } : {}),
        ...(dto.styleExpression ? { styleExpression: dto.styleExpression } : {}),
        ...(dto.ageRange ? { ageRange: dto.ageRange } : {}),
        ...(dto.garmentPreference ? { garmentPreference: dto.garmentPreference } : {}),
        onboardingStep: OnboardingStep.PHOTO,
      },
    });

    if (dto.height || dto.weight) {
      await this.recordConsentInternal(userId, "body_measurement", true);
    }

    return this.getOnboardingState(userId);
  }

  async skipStep(userId: string, step: string) {
    if (step !== "PHOTO" && step !== "STYLE_TEST") {
      throw new BadRequestException("只能跳过 PHOTO 或 STYLE_TEST 步骤");
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("用户画像不存在");
    }

    const stepEnum = step as OnboardingStep;
    if (profile.onboardingStep !== stepEnum) {
      throw new BadRequestException(`当前步骤不是 ${step}，无法跳过`);
    }

    const nextStep = step === "PHOTO" ? OnboardingStep.STYLE_TEST : OnboardingStep.COMPLETED;

    const skippedSteps = [...(profile.skippedOnboardingSteps || [])];
    if (!skippedSteps.includes(step)) {
      skippedSteps.push(step);
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        onboardingStep: nextStep,
        onboardingCompletedAt: null,
        skippedOnboardingSteps: skippedSteps,
      },
    });

    if (step === "PHOTO") {
      await this.recordConsentInternal(userId, "photo_processing", false);
    }

    return this.getOnboardingState(userId);
  }

  async getOnboardingProgress(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("用户画像不存在");
    }

    const currentStep = profile.onboardingStep;
    const percentage = STEP_PERCENTAGE[currentStep];
    const currentIndex = STEP_ORDER.indexOf(currentStep);

    const steps = STEP_ORDER.filter((s) => s !== OnboardingStep.COMPLETED).map((step) => {
      const stepIndex = STEP_ORDER.indexOf(step);

      if (stepIndex < currentIndex) {
        const isSkipped = (profile.skippedOnboardingSteps || []).includes(step);
        if (isSkipped) {
          return { step, status: "skipped" as const };
        }
        return { step, status: "completed" as const };
      }

      if (stepIndex === currentIndex) {
        if (currentStep === OnboardingStep.COMPLETED && profile.onboardingCompletedAt !== null) {
          return { step, status: "completed" as const };
        }
        return { step, status: "current" as const };
      }

      return { step, status: "pending" as const };
    });

    return { percentage, steps };
  }

  private async recordConsentInternal(
    userId: string,
    consentType: string,
    granted: boolean
  ): Promise<void> {
    try {
      await this.prisma.userConsent.upsert({
        where: {
          userId_consentType: { userId, consentType: consentType as any },
        },
        update: {
          granted,
          grantedAt: granted ? new Date() : null,
          revokedAt: !granted ? new Date() : null,
          version: "1.0",
        },
        create: {
          userId,
          consentType: consentType as any,
          granted,
          grantedAt: granted ? new Date() : null,
          version: "1.0",
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to record consent ${consentType} for user ${userId}: ${message}`);
    }
  }
}
