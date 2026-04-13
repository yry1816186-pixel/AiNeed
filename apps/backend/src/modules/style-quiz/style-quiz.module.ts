import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { OnboardingModule } from "../onboarding/onboarding.module";

import { StyleQuizController } from "./style-quiz.controller";
import { StyleQuizService } from "./style-quiz.service";
import { QuestionSelectorService } from "./services/question-selector";
import { ColorDeriverService } from "./services/color-deriver";
import { StyleKeywordExtractorService } from "./services/style-keyword-extractor";
import { QuizProgressService } from "./services/quiz-progress.service";
import { ColorDerivationEngine } from "./services/color-derivation.service";

@Module({
  imports: [PrismaModule, OnboardingModule],
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
