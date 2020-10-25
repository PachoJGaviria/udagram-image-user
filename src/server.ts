import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import {sequelize} from './sequelize';

import {IndexRouter} from './controllers/v0/index.router';
import {config} from './config/config';
import {V0_FEED_MODELS, V0_USER_MODELS} from './controllers/v0/model.index';

(async () => {
  sequelize.addModels(V0_FEED_MODELS);
  sequelize.addModels(V0_USER_MODELS);
  await sequelize.sync();

  const app = express();
  const port = process.env.PORT || 8080;

  app.use(bodyParser.json());

  app.use(cors({
    allowedHeaders: [
      'Origin', 'X-Requested-With',
      'Content-Type', 'Accept',
      'X-Access-Token', 'Authorization',
    ],
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    origin: config.service.clientsUrls,
  }));

  app.use('/api/v0/', IndexRouter);

  // Root URI call
  app.get('/', async (req, res) => {
    res.send('/api/v0/');
  });

  // Start the Server
  app.listen(port, () => {
    console.log(`server running port ${port}`);
    console.log(`press CTRL+C to stop server`);
  });
})();
