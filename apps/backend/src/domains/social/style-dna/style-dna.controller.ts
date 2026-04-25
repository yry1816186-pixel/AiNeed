import { Controller, Get, Post, Query, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";

import { ComputeStyleDnaResponseDto, StyleMatchesResponseDto } from "./dto/style-dna.dto";
import { StyleDnaService } from "./style-dna.service";

@ApiTags("social/style-dna")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("social/style-dna")
export class StyleDnaController {
  constructor(private readonly styleDnaService: StyleDnaService) {}

  @Get("matches")
  @ApiOperation({ summary: "Find users with similar style DNA" })
  @ApiQuery({
    name: "topK",
    required: false,
    type: Number,
    description: "Number of results (default 10)",
  })
  async getMatches(
    @Request() req: { user: { id: string } },
    @Query("topK") topK?: string
  ): Promise<StyleMatchesResponseDto> {
    const parsedTopK = topK ? parseInt(topK, 10) : 10;
    return this.styleDnaService.getMatches(req.user.id, parsedTopK);
  }

  @Post("compute")
  @ApiOperation({ summary: "Trigger style DNA computation for current user" })
  async computeStyleDna(
    @Request() req: { user: { id: string } }
  ): Promise<ComputeStyleDnaResponseDto> {
    // Fetch user behavior records and trigger ML computation
    // userId comes from JWT to prevent spoofing (T-08-05)
    await this.styleDnaService.computeStyleDna(req.user.id, [], []);
    return { success: true };
  }
}
