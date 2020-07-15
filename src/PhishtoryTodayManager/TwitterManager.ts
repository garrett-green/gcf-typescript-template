import * as Twit from 'twit';

export default class TwitterManager {
  twitter: Twit;
  constructor() {
    this.twitter = new Twit({
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
      access_token: process.env.ACCESS_TOKEN,
      access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    });
  }

  async post(message: string) {
    return await this.twitter
      .post('statuses/update', { status: message })
      .catch((err) => {
        console.log('ERROR: TwitterManager -> post');
        console.dir(err);
      });
  }

  async postReply(tweetId: number, message: string) {
    const data = {
      status: message,
      in_reply_to_status_id: tweetId,
      auto_populate_reply_metadata: true,
    };
    return await this.twitter.post('statuses/update', data).catch((err) => {
      console.log('ERROR: TwitterManager -> postReply');
      console.dir(err);
    });
  }
}
