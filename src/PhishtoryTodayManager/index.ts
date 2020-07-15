import axios from 'axios';
import TwitterManager from './TwitterManager';
import { PhishNet } from '../PhishDataManager';

export default class PhishtoryTodayManager extends TwitterManager {
  PHISH_NET_API_KEY: string;
  constructor() {
    super();
    this.PHISH_NET_API_KEY = process.env.PHISH_NET;
  }

  async getShow() {
    const {
      data: {
        response: { data },
      },
    } = await axios.get<PhishNet.API<PhishNet.Setlist>>(
      `https://api.phish.net/v3/setlists/tiph?apikey=${this.PHISH_NET_API_KEY}`
    );
    return data[0];
  }

  getDefaultReplyTweetCopy({ showdate }: PhishNet.Setlist) {
    return `🎶🎧🔊 
In most cases, you can give it a listen on @phish_in: 
http://phish.in/${showdate}
    
Or, check it out on #PhishTracks: 
http://www.phishtracks.com/shows/${showdate}

`;
  }

  getLinkTweetCopy(links: PhishNet.Link[]) {
    const linkIdx = this.getRandomNumber(0, links.length);
    return links[linkIdx];
  }

  getReplyTweetCopy(links: PhishNet.Link[]) {
    const link = links[this.getRandomNumber(0, links.length)];

    return `👀🎧📖 Check out this show's ${link.description}: 
${link.link}
`;
  }

  getShowTweetCopy({ location, rating, relative_date, url }: PhishNet.Setlist) {
    const tweet1 = `${relative_date}, @phish rocked ${location}.
    
This show's @phishnet rating is: ${rating}.
    
🎸🎹🌵⭕️ 

Check it out: ${url}`;

    const tweet2 = `${relative_date}, @phish rocked ${location}.

🎶🎸🎹🌵⭕️🎶
    
Check out why it has a ${rating} rating on @phishnet: 
${url}
`;

    const tweet3 = `📆🎤 ${relative_date}, @phish rocked ${location}.

This show's @phishnet rating is ${rating}. 👀
    
Check it out: ${url}
`;

    const tweets = [tweet1, tweet2, tweet3];

    return tweets[this.getRandomNumber(0, tweets.length)];
  }

  private getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
