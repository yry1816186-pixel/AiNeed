import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { OnboardingModule } from "../onboarding/onboarding.module";
import { ProfileModule } from "../profile/profile.module";

import { StyleQuizController } from "./style-quiz.controller";
import { StyleQuizService } from "./style-quiz.service";
import { QuestionSelectorService } from "./services/question-selector";
import { ColorDeriverService } from "./services/color-deriver";
import { StyleKeywordExtractorService } from "./services/style-keyword-extractor";
import { QuizProgressService } from "./services/quiz-progress.service";
import { ColorDerivationEngine } from "./services/color-derivation.service";

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
