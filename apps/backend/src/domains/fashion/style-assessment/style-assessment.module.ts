/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from "@nestjs/common";

import { StyleProfilesModule } from "./profiles/style-profiles.module";
import { StyleQuizModule } from "./quiz/style-quiz.module";

@Module({
  imports: [StyleProfilesModule, StyleQuizModule],
  exports: [StyleProfilesModule, StyleQuizModule],
})
export class StyleAssessmentModule {}
