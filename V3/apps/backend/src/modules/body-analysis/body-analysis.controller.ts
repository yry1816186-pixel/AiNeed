import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BodyAnalysisService } from './body-analysis.service';
import { AnalyzeBodyDto } from './dto/analyze-body.dto';
import { ColorSeasonDto } from './dto/color-season.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('BodyAnalysis')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('body-analysis')
export class BodyAnalysisController {
  constructor(private readonly bodyAnalysisService: BodyAnalysisService) {}

  @Post('analyze')
  @ApiOperation({ summary: '体型分析', description: '上传照片或输入身体数据，分析体型类型并给出穿搭建议' })
  @ApiResponse({ status: 200, description: '分析成功，返回体型类型和推荐' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  analyze(
    @CurrentUser('id') userId: string,
    @Body() dto: AnalyzeBodyDto,
  ) {
    return this.bodyAnalysisService.analyze(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: '获取我的体型档案', description: '获取当前用户的体型档案，含体型类型、色彩季型、身体测量数据' })
  @ApiResponse({ status: 200, description: '返回体型档案' })
  @ApiResponse({ status: 404, description: '尚未进行体型分析' })
  @ApiResponse({ status: 401, description: '未认证' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.bodyAnalysisService.getMyProfile(userId);
  }

  @Post('color-season')
  @ApiOperation({ summary: '色彩季型分析', description: '分析用户的色彩季型(春/夏/秋/冬)，提供适合的颜色建议' })
  @ApiResponse({ status: 200, description: '分析成功，返回色彩季型和推荐颜色' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  analyzeColorSeason(
    @CurrentUser('id') userId: string,
    @Body() dto: ColorSeasonDto,
  ) {
    return this.bodyAnalysisService.analyzeColorSeason(userId, dto);
  }
}
