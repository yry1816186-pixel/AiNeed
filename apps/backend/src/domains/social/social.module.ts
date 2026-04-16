import { Module } from '@nestjs/common';
import { CommunityModule } from './community/community.module';
import { BloggerModule } from './blogger/blogger.module';
import { ConsultantModule } from './consultant/consultant.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [CommunityModule, BloggerModule, ConsultantModule, ChatModule],
  exports: [CommunityModule, BloggerModule, ConsultantModule, ChatModule],
})
export class SocialModule {}
