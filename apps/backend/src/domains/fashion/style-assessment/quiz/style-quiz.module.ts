/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../../common/prisma/prisma.module";
import { OnboardingModule } from "../../../../domains/identity/onboarding/onboarding.module";
import { ProfileModule } from "../../../../domains/identity/profile/profile.module";

import { ColorDerivationEngine } from "./services/color-derivation.service";
import { ColorDeriverService } from "./services/color-deriver";
import { QuestionSelectorService } from "./services/question-selector";
import { QuizProgressService } from "./services/quiz-progress.service";
import { StyleKeywordExtractorService } from "./services/style-keyword-extractor";
import { StyleQuizController } from "./style-quiz.controller";
import { StyleQuizService } from "./style-quiz.service";

@Module({
  imports: [PrismaModule, OnboardingModule, forwardRef(() => ProfileModule)],
  controllers: [StyleQuizController],
  providers: [
    StyleQuizService,
    QuestionSelectorService,
    ColorDeriverService,
    StyleKeywordExtractorService,
    QuizProgressService,
    ColorDerivationEngine,
  ],
  exports: [StyleQuizService, QuizProgressService, ColorDerivationEngine],
})
export class StyleQuizModule {}
