import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ELASTICSEARCH_PROVIDER } from './providers/elasticsearch.provider';
import { DATABASE_PROVIDER } from './providers/database.provider';

@Module({
  controllers: [SearchController],
  providers: [SearchService, ELASTICSEARCH_PROVIDER, DATABASE_PROVIDER],
  exports: [SearchService],
})
export class SearchModule {}
