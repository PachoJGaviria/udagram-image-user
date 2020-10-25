import {Router, Request, Response} from 'express';
import {FeedItem} from '../models/FeedItem';
import {requireAuth} from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';
import {isNumeric} from 'validator';

// eslint-disable-next-line new-cap
const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
  const items = await FeedItem.findAndCountAll({order: [['id', 'DESC']]});
  items.rows.forEach((item) => {
    item.url = AWS.getSignedUrlToRead(item.url);
  });
  res.send(items);
});

// Get a feed item by id
router.get('/:id', async (req: Request, res: Response) => {
  const {id} = req.params;
  if (!id) {
    res
        .status(400)
        .send('The feed id is required.');
  }

  try {
    const feedItem = await FeedItem.findByPk(id);
    if (feedItem) {
      res.status(200)
          .send(feedItem);
    } else {
      res
          .status(404)
          .send(`Feet with id ${id} not found.`);
    }
  } catch (err) {
    res
        .status(404)
        .send(`Feet with id ${id} not found.`);
  }
});

// update a specific resource
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const {id} = req.params;
  if (!id || !isNumeric(id)) {
    res
        .status(400)
        .send('The feet id is a number required.');
  }

  const {caption, url} = req.body;
  if (!caption) {
    res
        .status(400)
        .send('The caption is required.');
  }
  if (!url) {
    res
        .status(400)
        .send('The caption is required.');
  }


  try {
    const feedItem = await FeedItem.findByPk(id);
    if (feedItem) {
      feedItem.caption = caption;
      feedItem.url = url;
      await feedItem.save();
      res
          .status(200)
          .send('The feed item was updated.');
    } else {
      res
          .status(404)
          .send(`The feed item with id ${id} not found`);
    }
  } catch (err) {
    res
        .status(500)
        .send(`Internal Server Error updating the feed item with id ${id}
      Error: ${err}`);
  }
});


// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName',
    requireAuth,
    async (req: Request, res: Response) => {
      const {fileName} = req.params;
      const url = AWS.getSignedUrlToWrite(fileName);
      res.status(201).send({url: url});
    });

// Post meta data and the filename after a file is uploaded
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/',
    requireAuth,
    async (req: Request, res: Response) => {
      const caption = req.body.caption;
      const fileName = req.body.url;

      // check Caption is valid
      if (!caption) {
        return res.status(400)
            .send({message: 'Caption is required or malformed'});
      }

      // check Filename is valid
      if (!fileName) {
        return res.status(400).send({message: 'File url is required'});
      }

      const item = new FeedItem({
        caption: caption,
        url: fileName,
      });

      const savedItem = await item.save();

      savedItem.url = AWS.getSignedUrlToRead(savedItem.url);
      res.status(201).send(savedItem);
    });

export const FeedRouter: Router = router;
