import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DemoService } from './demo.service';

@ApiTags('Demo - 比赛演示')
@Controller('api/v1/demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get()
  @ApiOperation({
    summary: '获取完整 Demo 数据（离线模式）',
    description:
      '返回预设的完整演示数据，用于比赛现场网络不稳定时的离线演示。包含用户、服装、推荐、AI对话等所有数据。',
  })
  @ApiResponse({ status: 200, description: '成功获取 Demo 数据' })
  async getFullDemoData() {
    return this.demoService.getFullDemoData();
  }

  @Get('users')
  @ApiOperation({ summary: '获取 Demo 用户列表', description: '返回所有测试账号信息（密码已脱敏）' })
  async getDemoUsers() {
    return this.demoService.getDemoUsers();
  }

  @Get('clothing')
  @ApiOperation({ summary: '获取 Demo 服装数据', description: '返回所有服装商品数据（50+条）' })
  async getClothingData() {
    return this.demoService.getClothingData();
  }

  @Get('recommendations')
  @ApiOperation({ summary: '获取 Demo 推荐结果', description: '返回预置的个性化推荐列表' })
  async getRecommendations() {
    return this.demoService.getRecommendations();
  }

  @Get('conversations')
  @ApiOperation({ summary: '获取 AI 对话场景', description: '返回预置的 AI 对话历史（4个场景）' })
  async getConversations() {
    return this.demoService.getConversations();
  }

  @Get('stats')
  @ApiOperation({ summary: '获取 Demo 数据统计', description: '返回当前 Demo 数据的各项统计指标' })
  async getStats() {
    return this.demoService.getStats();
  }
}
