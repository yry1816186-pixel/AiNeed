import { Module } from "@nestjs/common";

import { BloggerModule } from "./blogger/blogger.module";
import { ChatModule } from "./chat/chat.module";
import { CommunityModule } from "./community/community.module";
import { ConsultantModule } from "./consultant/consultant.module";
import { StyleDnaModule } from "./style-dna/style-dna.module";

@Module({
  imports: [CommunityModule, BloggerModule, ConsultantModule, ChatModule, StyleDnaModule],
  exports: [CommunityModule, BloggerModule, ConsultantModule, ChatModule, StyleDnaModule],
})
export class SocialModule {}
