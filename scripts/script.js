
document.addEventListener("DOMContentLoaded", function() {
  'use strict';

  // App controls and methods
  var App = {
    sessionVars: null,
    mutedElements: {},
    audioContext: {
      currentIndex: false,
      maxIndex: document.querySelectorAll('#audio-tracks meta').length,
    },
    appMuted: null,
    initSessionVars: function(clear) {

      if (clear) {
        sessionStorage.removeItem('trak_progress');
        this.sessionVars = null;
      }

      var sessionVars = this.getProgress();

      if (sessionVars == null) {
        sessionVars = {
          tom_trak_1: false,
          tom_trak_2: false,
          priscilla_trak_1: false,
          priscilla_trak_2: false,
        };
        // Make this var available on subsequent page loads
        sessionStorage.setItem('trak_progress', JSON.stringify(sessionVars));
        this.sessionVars = sessionVars;
      }
    },
    getProgress: function() {
      if (this.sessionVars == null) {
        return JSON.parse(sessionStorage.getItem('trak_progress'));
      }
      else {
        return this.sessionVars;
      }
    },
    setProgress: function(key, value) {
      var progress = this.getProgress();
      progress[key] = value;
      this.sessionVars = progress;
      sessionStorage.setItem('trak_progress', JSON.stringify(this.sessionVars));
    },
    audioControl: function(mute) {
      var mediaElements = document.querySelectorAll('video, audio');

      if (mediaElements) {
        console.log(mediaElements);
        for (var i = 0; i < mediaElements.length; i++) {
          var element = mediaElements[i];
          // If we aren't muting, and for whatever reason we didnt save the previous volume value, use full volume
          var volume = 1;
          console.log(this.appMuted);
          if (this.appMuted) {
            if (this.mutedElements[element.id]) {
              volume = this.mutedElements[element.id];
            }
            this.appMuted = false;
          }
          else {
            this.mutedElements[element.id] = element.volume;
            volume = 0;
            this.appMuted = true;
          }
          element.volume = volume;
        }
        var volumeButtons = document.querySelectorAll('[data-nav="volume"] img');
        if (volumeButtons) {
          var attr = 'data-mute-src';
          if (this.appMuted) {
            attr = 'data-volume-src';
          }
          volumeButtons.forEach(function(volumeButton) {
            volumeButton.src = volumeButton.getAttribute(attr);
          });
        }
      }
    },
    // Helper to ensure that play() invocations operate properly
    playMedia: function(element, requireInteractionOnFail) {
      var playPromise = element.play();

      if (playPromise) {
        playPromise.then(_ => {
          if (requireInteractionOnFail) {
            App.interactionBanner(false);
          }
        })
        .catch(error => {
          if (requireInteractionOnFail) {
            App.interactionBanner(true);
          }
        });
      }
    },
    interactionBanner: function(show) {
      var body = document.querySelector('body');
      if (show) {
        body.classList.add('interaction-needed');
        var bannerButton = document.querySelector('#interaction-button');
        bannerButton.addEventListener('click', function interactListen() {
          App.interactionBanner(false);
          window.location.reload();
        });
      }
      else {
        body.classList.remove('interaction-needed');
      }
    },
    buttonToggle: function(button) {
      button.classList.toggle('active');
    },
    resetAudioIndex: function() {
      this.audioContext = {
        currentIndex: false,
      };
      var player = document.querySelector("#audioElement");
      player.setAttribute('src', '');
      this.instructionalAudio(0, true);
    },
    instructionalAudio(index, playthrough) {
      if (!document.querySelector("#audio-tracks")) {
        return;
      }
      if (index == null) {
        if (!this.audioContext.currentIndex) {
          index = 0;
        }
        else {
          index = this.audioContext.currentIndex;
        }
      }
      if (playthrough == null) {
        playthrough = true;
      }
      var tracks = document.querySelector('#audio-tracks');
      var trackData = tracks.querySelectorAll('[data-audio-src]');
      var player = document.querySelector("#audioElement");
      if (!trackData[index]) {
        playthrough = false;
        this.audioContext.currentIndex = true;
      }
      else if (trackData[index].getAttribute('data-audio-src')) {
        player.setAttribute('src', trackData[index].getAttribute('data-audio-src'));
        var focusedElement = document.querySelector('[data-audio-index="' + index + '"]');
        if (focusedElement) {
          player.addEventListener('play', function buttonStart() {
            player.removeEventListener('play', buttonStart);
            var over = new Event('mouseover');
            focusedElement.dispatchEvent(over);
            focusedElement.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
          });
          player.addEventListener('ended', function buttonEnd() {
            player.removeEventListener('ended', buttonEnd);
            var out = new Event('mouseout');
            focusedElement.dispatchEvent(out);
          });
        }
        this.playMedia(player, true);
      }
      if (playthrough && this.audioContext.currentIndex !== true) {
        player.addEventListener('ended', function playNext() {
          player.removeEventListener('ended', playNext);
          App.audioContext.currentIndex = index + 1;
          App.instructionalAudio(index + 1, true);
        });
      }
      // If all audio finished
      var index1 = this.audioContext.currentIndex + 1;
      if (index1 == this.audioContext.maxIndex) {
        var tracks = document.querySelector('#audio-tracks');
        if (tracks.getAttribute('data-autonext') && tracks.getAttribute('data-next-path')) {
          player.addEventListener('ended', function() {
            window.location = tracks.getAttribute('data-next-path') + '.html';
          });
        }
      }
    },
  };

  // Init session
  App.initSessionVars(false);

  // Autoplay video
  var video = document.querySelector("#videoElement");
  if (video) {
    App.playMedia(video);
  }

  // Autoplay instructional audio
  App.instructionalAudio();

  var progressMedia = document.querySelectorAll('[data-progress-name]');

  if (progressMedia) {
    for (var i = 0; i < progressMedia.length; i++) {
      var element = progressMedia[i];

      element.addEventListener('ended', function() {
        // Save progress info
        var name = element.getAttribute('data-progress-name');
        if (name) {
          App.setProgress(name, true);
        }
        // Goto next page after a short delay
        window.setTimeout(function() {
          var baseUrl = document.querySelector('#base-url').href;
          var pathAttr = 'data-next-path';
          var requirements = element.getAttribute('data-required-progress');
          if (requirements) {
            var requirements = element.getAttribute('data-required-progress');
            var reqs = Object.assign({}, requirements.split(','));
            var currentProgress = App.getProgress();
            for (var i in reqs) {
              console.log(reqs[i]);
              if (currentProgress[reqs[i]]) {
                delete reqs[i];
              }
            }
            if (!Object.keys(reqs).length) {
              var pathAttr = 'data-finish-path';
            }
          }
          window.location = baseUrl + element.getAttribute(pathAttr);
        }, 3000);
      });
    }
  }

  // If volume button is clicked, toggle the audio on the page
  document.querySelectorAll('[data-nav="volume"]').forEach(function(element) {
      element.addEventListener('click', function(event) {
        event.preventDefault();
        App.audioControl();
      });
  });

  // Go back 1 page if the nav is clicked
  document.querySelectorAll('[data-nav="back-nav"]').forEach(function(element) {
      element.addEventListener('click', function(event) {
        event.preventDefault();
        history.back();
      });
  });

  // If volume button is clicked, toggle the audio on the page
  document.querySelectorAll('[data-nav="audio-replay"]').forEach(function(element) {
      element.addEventListener('click', function(event) {
        event.preventDefault();
        App.resetAudioIndex();
      });
  });

  // If volume button is clicked, toggle the audio on the page
  document.querySelectorAll('[data-nav="app-exit"]').forEach(function(element) {
      element.addEventListener('click', function(event) {
        // Clear progress
        App.initSessionVars(true);
      });
  });

  // Give the document access to our code
  window.App = App;

});
