import 'dotenv/config';
import { ingestNews } from '../src/server/news';
import { sqlClient } from '../src/server/db';
try {console.log(JSON.stringify({event:'news_ingestion',count:await ingestNews(process.env.NEWS_FEED_URL||'',process.env.NEWS_LICENSE||'',process.env.NEWS_METADATA_PERMISSION==='true')}));}finally{await sqlClient().end();}
