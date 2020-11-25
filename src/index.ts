import { config } from 'dotenv';
import { Request, Response } from 'express';
import PhishDataManager from './PhishDataManager';
import PhishtoryTodayManager from './PhishtoryTodayManager';
import { default as showsOnSpotify } from './PhishDataManager/albumsOnSpotify';

config();

const phishData = new PhishDataManager();

export const getPhishtory = async (req: Request, res: Response) => {
  res.set('Access-Control-Allow-Origin', 'https://phishtory-site.vercel.app/');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Credentials', 'true');

  if (!(JSON.stringify(req.body) === '{}')) {
    phishData.setDate({ ...req.body });
  }

  const phishtory = await phishData.getPhishtory();

  const sortedPhishtory = phishtory.sort(
    ({ rating: ratingA }, { rating: ratingB }) => ratingB - ratingA
  );

  res.send(sortedPhishtory);
};

const phishtory = new PhishtoryTodayManager();

export const tweetTodayInPhishtory = async (req: Request, res: Response) => {
  const tiph = await phishtory.getShow();

  const tweetCopy = !showsOnSpotify[tiph.showdate]
    ? phishtory.getShowTweetCopy(tiph)
    : phishtory.getSpotifyTweetCopy(tiph, showsOnSpotify[tiph.showdate]);

  const tweet: any = await phishtory.post(tweetCopy).catch((err) => {
    console.log('ERROR: tweetTodayInPhishtory -> tweet');
    console.dir(err);
    res.status(401).send(new Error(JSON.stringify(err)));
  });

  console.log(`POSTED: tweetTodayInPhishtory -> tweet`, JSON.stringify(tweet));

  const showLinks = await phishData.getShowLinks(tiph.showid);

  const replyTweet =
    !showLinks || !showLinks.links || showLinks.links.length < 1
      ? phishtory.getDefaultReplyTweetCopy(tiph)
      : phishtory.getReplyTweetCopy(showLinks.links);

  const reply: any = await phishtory
    .postReply(tweet.data.id_str, replyTweet)
    .catch((err) => {
      console.log('ERROR: tweetTodayInPhishtory -> reply');
      console.dir(err);
      res.status(402).send(new Error(JSON.stringify(err)));
    });

  console.log(`POSTED: tweetTodayInPhishtory -> reply`, JSON.stringify(reply));

  res.status(201).send(true);
};
