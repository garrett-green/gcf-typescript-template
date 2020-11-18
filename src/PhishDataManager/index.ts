import axios from 'axios';

export default class PhishDataManager {
  date: Date;
  constructor() {
    this.date = new Date();
  }

  async getPhishtory() {
    const todaysShows = await this.getShowsByDate();

    const setlists = await Promise.all(
      todaysShows.map((show) => this.getSetlistData(show.showid))
    );

    const setlistLinksData = await Promise.all(
      setlists
        .filter((setlist) => !!setlist && !!setlist.showid)
        .map((setlist) => this.getShowLinks(setlist.showid))
    );

    return setlists.reduce(
      (
        setlists: PhishNet.FormattedSetlist[],
        currentSetlist: PhishNet.Setlist
      ) => {
        if (!!currentSetlist) {
          const showLinks = setlistLinksData.find(
            (setlistLinks) =>
              setlistLinks &&
              currentSetlist &&
              setlistLinks.showId === currentSetlist.showid
          );
          setlists.push({
            ...this.getSetlist(currentSetlist),
            links: showLinks && showLinks.links ? showLinks.links : [],
          });
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
    const month = this.date.getMonth() + 1;
    const day = this.date.getDate();

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

  async getShowLinks(
    showId: number
  ): Promise<{ showId: number; links: Partial<PhishNet.Link[]> } | null> {
    const {
      data: {
        response: { count, data },
      },
    } = await axios.get<PhishNet.API<Omit<PhishNet.Link, 'showId'>>>(
      `https://api.phish.net/v3/shows/links?apikey=${process.env.PHISH_NET}&showid=${showId}`
    );
    return count > 0 ? { showId, links: data } : null;
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
    setlistnotes: setlistNotes,
    showdate: date,
    showid: showId,
    url: phishNetURL,
  }: PhishNet.Setlist): PhishNet.FormattedSetlist {
    const setOneIndex = setlistdata.indexOf(
      `<span class='set-label'>Set 1</span>:`
    );
    const setTwoIndex = setlistdata.indexOf(
      `<span class='set-label'>Set 2</span>:`
    );
    const setThreeIndex = setlistdata.indexOf(
      `<span class='set-label'>Set 3</span>:`
    );
    const setFourIndex = setlistdata.indexOf(
      `<span class='set-label'>Set 4</span>:`
    );
    const encoreIndex = setlistdata.indexOf(
      `<span class='set-label'>Encore</span>:`
    );

    const setOne = setlistdata.substring(setOneIndex, setTwoIndex);
    const setTwo = setlistdata.substring(setTwoIndex, setThreeIndex);

    const setThree =
      setThreeIndex > 0
        ? setlistdata.substring(
            setThreeIndex,
            setFourIndex < encoreIndex ? setFourIndex : encoreIndex
          )
        : null;

    const setFour =
      setFourIndex > 0
        ? setFourIndex < encoreIndex
          ? setlistdata.substring(setFourIndex, encoreIndex)
          : setlistdata.substring(setFourIndex)
        : null;

    const encore =
      encoreIndex > 0
        ? encoreIndex < setFourIndex
          ? setlistdata.substring(encoreIndex, setFourIndex)
          : setlistdata.substring(encoreIndex)
        : null;

    const jamNotes = this.getJamNotes(setlistdata);

    return {
      date,
      location,
      phishNetURL,
      rating: Number(rating),
      showId,
      setlistNotes,
      ...(jamNotes && jamNotes.length > 0 && { jamNotes }),
      setOne: this.getSongs(setOne),
      ...(setTwo && { setTwo: this.getSongs(setTwo) }),
      ...(setThree && { setThree: this.getSongs(setThree) }),
      ...(setFour && { setFour: this.getSongs(setFour) }),
      ...(encore && { encore: this.getSongs(encore) }),
    };
  }

  setDate({
    month = (this.date.getMonth() + 1).toString(),
    day = this.date.getDate().toString(),
  }: {
    month: string;
    day: string;
  }) {
    this.date = new Date(
      this.date.getFullYear(),
      Number(month) - 1,
      Number(day)
    );
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
    showId: number;
    date: string | Date;
    location: string;
    phishNetURL: string;
    rating: number;
    setlistNotes?: string;
    jamNotes?: string[];
    setOne: string[];
    setTwo?: string[];
    setThree?: string[];
    setFour?: string[];
    encore?: string[];
    links?: Partial<Link[]> | null;
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
