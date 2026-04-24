import { Module } from "@nestjs/common";

import { BloggerModule } from "./blogger/blogger.module";
import { ChatModule } from "./chat/chat.module";
import { CommunityModule } from "./community/community.module";
import { ConsultantModule } from "./consultant/consultant.module";

@Module({
  imports: [CommunityModule, BloggerModule, ConsultantModule, ChatModule],
  exports: [CommunityModule, BloggerModule, ConsultantModule, ChatModule],
})
export class SocialModule {}
