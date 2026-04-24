import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsBoolean, IsIn } from "class-validator";

const PIPL_CONSENT_TYPES = [
  "body_measurement",
  "photo_processing",
  "body_type_classification",
  "ai_recommendation",
  "tracking",
] as const;

export class RecordPIPLConsentDto {
  @ApiProperty({
    description: "同意类型",
    example: "body_measurement",
    enum: PIPL_CONSENT_TYPES,
  })
  @IsString()
  @IsIn(PIPL_CONSENT_TYPES, {
    message:
      "consentType 必须是 body_measurement, photo_processing, body_type_classification, ai_recommendation 或 tracking",
  })
  consentType!: string;

  @ApiProperty({ description: "是否同意", example: true })
  @IsBoolean()
  granted!: boolean;
}

export class WithdrawConsentDto {
  @ApiProperty({
    description: "要撤回的同意类型",
    example: "tracking",
    enum: PIPL_CONSENT_TYPES,
  })
  @IsString()
  @IsIn(PIPL_CONSENT_TYPES, {
    message:
      "consentType 必须是 body_measurement, photo_processing, body_type_classification, ai_recommendation 或 tracking",
  })
  consentType!: string;
}
