import axios from 'axios';

export default class PhishDataManager {
  today: Date;
  constructor() {
    this.today = new Date();
  }

  async getPhishtory() {
    const todaysShows = await this.getShowsByDate();

    const setlistData = await Promise.all(
      todaysShows.map((show) => this.getSetlistData(show.showid))
    );

    return setlistData.reduce(
      (
        setlists: PhishNet.FormattedSetlist[],
        currentSetlist: PhishNet.Setlist
      ) => {
        if (!!currentSetlist) {
          setlists.push(this.getSetlist(currentSetlist));
        }
        return setlists;
      },
      []
    );
  }

  async getSetlistData(showID: number) {
    const req = `https://api.phish.net/v3/setlists/get?apikey=${process.env.PHISH_NET}&showid=${showID}`;

    const {
      data: {
        response: { data },
      },
    } = await axios.get<PhishNet.API<PhishNet.Setlist>>(req);

    return data[0];
  }

  async getShowsByDate() {
    const month = this.today.getMonth() + 1;
    const day = this.today.getDate();

    const req = `https://api.phish.net/v3/shows/query?apikey=${process.env.PHISH_NET}&month=${month}&day=${day}&order=ASC`;

    const {
      data: {
        response: { data },
      },
    } = await axios.post<PhishNet.API<PhishNet.Show>>(req).catch((error) => {
      const errorMessage = `Failed to fetch shows from phish.net. ERROR: ${error}.`;
      throw new Error(errorMessage);
    });

    return data.filter((show) => show.artistid === 1);
  }

  async getShowLinks(showId: number) {
    const { data } = await axios.get<PhishNet.Response<PhishNet.Link>>(
      `https://api.phish.net/v3/shows/links?apikey=${process.env.PHISH_NET}&showid=${showId}`
    );
    return data.count > 0 ? data.data : null;
  }

  getJamNotes(setlistdata: string) {
    return setlistdata
      .split('<a title="')
      .reduce((jamNotes: string[], currentSong: string) => {
        if (!currentSong.startsWith('<')) {
          const cleanUp = /&quot;/gi;
          const jamNote = currentSong
            .slice(0, currentSong.indexOf('" href='))
            .replace(cleanUp, '');
          const songTitle = currentSong.slice(
            currentSong.indexOf("class='setlist-song'>") +
              "class='setlist-song'>".length,
            currentSong.indexOf('</a>')
          );
          jamNotes.push(`${songTitle.toUpperCase()}: ${jamNote}`);
        }
        return jamNotes;
      }, []);
  }

  getSetlist({
    location,
    rating,
    setlistdata,
    showdate: date,
    url: phishNetURL,
  }: PhishNet.Setlist): PhishNet.FormattedSetlist {
    const setOneIndex = setlistdata.indexOf(
      `<span class='set-label'>Set 1</span>:`
    );
    const setTwoIndex = setlistdata.indexOf(
      `<span class='set-label'>Set 2</span>:`
    );
    const encoreIndex = setlistdata.indexOf(
      `<span class='set-label'>Encore</span>:`
    );
    const set1songs = setlistdata.slice(setOneIndex, setTwoIndex);
    const set2songs = setlistdata.slice(setTwoIndex, encoreIndex);
    const encoreSongs = setlistdata.slice(encoreIndex);
    const jamNotes = this.getJamNotes(setlistdata);

    return {
      date,
      encore: this.getSongs(encoreSongs),
      jamNotes,
      location,
      phishNetURL,
      rating: Number(rating),
      setOne: this.getSongs(set1songs),
      setTwo: this.getSongs(set2songs),
    };
  }

  private getSongs(setList: string) {
    return setList
      .split(`class='setlist-song'>`)
      .reduce((songs: string[], currentSong) => {
        if (!currentSong.startsWith('<')) {
          const title = currentSong.slice(0, currentSong.indexOf('</a>'));
          songs.push(title);
        }
        return songs;
      }, []);
  }
}

export namespace PhishNet {
  export interface API<T> {
    error_code: number;
    error_message: unknown;
    response: Response<T>;
  }

  export interface Response<T> {
    count: number;
    data: T[];
  }

  export interface FormattedSetlist {
    date: string | Date;
    encore: string[];
    jamNotes: string[];
    location: string;
    phishNetURL: string;
    rating: number;
    setOne: string[];
    setTwo: string[];
  }

  export interface Link {
    description: string;
    link: string;
    type: string;
  }

  /* spell-checker: disable */
  export interface Show {
    showid: number;
    artistid: number;
    artistlink: string;
    billed_as: string;
    link: string;
    location: string;
    setlistnotes?: string;
    showdate: string;
    tour_when: string;
    tourid: number;
    tourname: string;
    venue: string;
    venueid: number;
  }
  /* spell-checker: enable */

  /* spell-checker: disable */
  export interface Setlist {
    showid: number;
    artist: string;
    artistid: number;
    gapchart: string;
    location: string;
    long_date: string;
    rating: string;
    relative_date: string;
    setlistdata: string;
    setlistnotes: string;
    short_date: string;
    showdate: string;
    url: string;
    venue: string;
    venueid: number;
  }
  /* spell-checker: enable */
}
