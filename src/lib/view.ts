import { IAudioItem } from './interfaces';
import cplayer from './';
import returntypeof from './helper/returntypeof';
import { EventEmitter } from 'events';

const htmlTemplate = require('../cplayer.html');
require('../scss/cplayer.scss');

function buildLyric(lyric: string, sublyric?: string) {
  return lyric + (sublyric?`<span class="cp-lyric-text-sub">${sublyric}</span>`:'')
}

export default class cplayerView extends EventEmitter {
  private elementLinks = returntypeof(this.getElementLinks);
  private rootElement: Element;
  private player: cplayer;

  constructor(element: Element, player: cplayer) {
    super();
    element.innerHTML = htmlTemplate;
    this.player = player;
    this.rootElement = element.getElementsByTagName('c-player')[0];
    this.elementLinks = this.getElementLinks();
    this.injectEventListener();
    this.setPlayIcon(this.player.paused);
  }

  private getElementLinks(rootElement: Element = this.rootElement) {
    return {
      icon: {
        play: rootElement.getElementsByClassName('cp-play-icon')[0],
        mode: rootElement.getElementsByClassName('cp-mode-icon')[0],
      },
      button: {
        prev: rootElement.getElementsByClassName('cp-prev-button')[0],
        play: rootElement.getElementsByClassName('cp-play-button')[0],
        next: rootElement.getElementsByClassName('cp-next-button')[0],
        volume: rootElement.getElementsByClassName('cp-volume-icon')[0],
        list: rootElement.getElementsByClassName('cp-list-button')[0],
        mode: rootElement.getElementsByClassName('cp-mode-button')[0]
      },
      progress: rootElement.getElementsByClassName('cp-progress-fill')[0] as HTMLElement,
      poster: rootElement.getElementsByClassName('cp-poster')[0] as HTMLElement,
      title: rootElement.getElementsByClassName('cp-audio-title')[0] as HTMLElement,
      artist: rootElement.getElementsByClassName('cp-audio-artist')[0] as HTMLElement,
      lyric: rootElement.getElementsByClassName('cp-lyric-text')[0] as HTMLElement,
      lyricContainer: rootElement.getElementsByClassName('cp-lyric')[0] as HTMLElement,
      volumeController: rootElement.getElementsByClassName('cp-volume-controller')[0] as HTMLElement,
      volumeFill: rootElement.getElementsByClassName('cp-volume-fill')[0] as HTMLElement,
      volumeControllerButton: rootElement.getElementsByClassName('cp-volume-controller-button')[0] as HTMLElement,
      volumeControllerContainer: rootElement.getElementsByClassName('cp-volume-container')[0] as HTMLElement
    }
  }

  private setPlayIcon(paused: boolean) {
    if (paused) {
      this.elementLinks.icon.play.classList.add('cp-play-icon-paused');
    } else {
      this.elementLinks.icon.play.classList.remove('cp-play-icon-paused');
    }
  }

  private setProgress(point: number) {
    this.elementLinks.progress.style.transform = `translateX(-${100 - point * 100}%)`
  }

  private setPoster(src: string) {
    this.elementLinks.poster.style.backgroundImage = `url("${src}")`;
  }

  private __OldVolume = 1;
  private setVolume(volume: number) {
    if (this.__OldVolume !== volume) {
      this.elementLinks.volumeFill.style.width = `${volume * 100}%`;
      this.elementLinks.volumeControllerButton.style.right = (1 - volume) * 100 + '%';
      this.__OldVolume = volume
    }
  }

  private setVolumeControllerKeepShow() {
    this.elementLinks.volumeControllerContainer.classList.add('cp-volume-container-show');
  }

  private toggleVolumeControllerKeepShow() {
    this.elementLinks.volumeControllerContainer.classList.toggle('cp-volume-container-show');
  }

  private removeVolumeControllerKeepShow() {
    this.elementLinks.volumeControllerContainer.classList.remove('cp-volume-container-show');
  }

  private __OldLyric = '';
  private __OldTotalTime = 0;

  private setLyric(lyric: string, time: number = 0, totalTime: number = 0) {
    if (this.__OldLyric !== lyric || this.__OldTotalTime !== totalTime) {
      this.elementLinks.lyric.innerHTML = lyric;
      this.elementLinks.lyric.style.transition = '';
      this.elementLinks.lyric.style.transform = '';
      if (totalTime !== 0) {
        let lyricWidth = this.elementLinks.lyric.clientWidth;
        let lyricContainerWidth = this.elementLinks.lyricContainer.clientWidth;
        if (lyricWidth > lyricContainerWidth) {
          let duration = totalTime - time;
          let targetOffset = (lyricWidth - lyricContainerWidth);
          let timepage = lyricContainerWidth / lyricWidth * duration;
          let startTime = Math.min(timepage * 0.6, duration);
          let moveTime = duration - timepage;

          this.elementLinks.lyric.style.transition = `transform ${moveTime}ms linear ${startTime}ms`
          this.elementLinks.lyric.style.transform = `translateX(-${targetOffset}px)`;
        }
      }
      this.__OldLyric = lyric;
      this.__OldTotalTime = totalTime;
    }
  }

  private injectEventListener() {
    this.elementLinks.button.play.addEventListener('click', this.handleClickPlayButton);
    this.elementLinks.button.prev.addEventListener('click', this.handleClickPrevButton);
    this.elementLinks.button.next.addEventListener('click', this.handleClickNextButton);
    this.elementLinks.button.volume.addEventListener('click', this.handleClickVolumeButton)
    this.elementLinks.volumeController.addEventListener('mousemove', this.handleMouseVolumeController)
    this.elementLinks.volumeController.addEventListener('mousedown', this.handleMouseVolumeController)
    this.elementLinks.volumeController.addEventListener('touchmove', this.handleTouchVolumeController)

    this.player.addListener('playstatechange', this.handlePlayStateChange);
    this.player.addListener('timeupdate', this.handleTimeUpdate);
    this.player.addListener('openaudio', this.handleOpenAudio);
    this.player.addListener('volumechange', this.handleVolumeChange)
  }

  private updateLyric(playedTime: number = 0) {
    if (this.player.nowplay.lyric && this.player.played) {
      let lyric = this.player.nowplay.lyric.getLyric(playedTime * 1000);
      let nextLyric = this.player.nowplay.lyric.getNextLyric(playedTime * 1000);
      if (lyric) {
        if (nextLyric) {
          let duration = nextLyric.time - lyric.time;
          let currentTime = playedTime * 1000 - lyric.time;
          this.setLyric(buildLyric(lyric.word), currentTime, duration);
        } else {
          let duration = this.player.audioElement.duration - lyric.time;
          let currentTime = playedTime * 1000 - lyric.time;
          this.setLyric(buildLyric(lyric.word), currentTime, duration);
        }
      } else {
        this.setLyric(buildLyric(this.player.nowplay.name, this.player.nowplay.artist), playedTime * 1000, nextLyric.time);
      }
    } else {
      this.setLyric(buildLyric(this.player.nowplay.name, this.player.nowplay.artist));
    }
  }

  private handleClickPlayButton = () => {
    this.player.targetPlayState();
  }

  private handleClickVolumeButton = () => {
    this.toggleVolumeControllerKeepShow();
  }

  private handleOpenAudio = (audio: IAudioItem) => {
    this.setPoster(audio.poster);
    this.setProgress(0);
    this.elementLinks.title.innerText = audio.name;
    this.elementLinks.artist.innerText = audio.artist;
    this.updateLyric();
  }

  private handleVolumeChange = (volume:number) => {
    this.setVolume(volume);
  };

  private handleTimeUpdate = (playedTime: number, time: number) => {
    this.setProgress(playedTime / time);
    this.updateLyric(playedTime);
  }

  private handleClickPrevButton = () => {
    this.player.prev();
  }

  private handleClickNextButton = () => {
    this.player.next();
  }

  private handlePlayStateChange = (paused: boolean) => {
    this.setPlayIcon(paused);
  }

  private handleMouseVolumeController = (event: MouseEvent) => {
    this.removeVolumeControllerKeepShow()
    if (event.buttons === 1) {
      let volume = Math.max(0, Math.min(1.0,
        (event.clientX - this.elementLinks.volumeController.getBoundingClientRect().left) / this.elementLinks.volumeController.clientWidth
      ));
      this.player.setVolume(volume);
      this.setVolume(volume);
    }
  };

  private handleTouchVolumeController = (event: TouchEvent) => {
    this.removeVolumeControllerKeepShow()
    let volume = Math.max(0, Math.min(1.0,
      (event.targetTouches[0].clientX - this.elementLinks.volumeController.getBoundingClientRect().left) / this.elementLinks.volumeController.clientWidth
    ));
    this.player.setVolume(volume);
    this.setVolume(volume);
  };
}
