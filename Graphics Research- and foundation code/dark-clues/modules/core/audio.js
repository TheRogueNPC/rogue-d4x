// ═══════════════════════════════════════════════════════════════════
// AUDIO — modules/core/audio.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: Sounds
// ═══════════════════════════════════════════════════════════════════

/**
 * Sounds — Static audio manager for the Dark Clues roguelike.
 *
 * Provides a thin wrapper around OpenFL / Lime audio facilities:
 *
 * - **One-shot events** — play a sound effect once with optional volume
 *   and pitch offset (semitones).
 * - **Ambient loops** — loop a background sound with smooth fade-in /
 *   fade-out transitions when switching between environments.
 * - **Pitch shifting** — resamples a sound asset at 25 different pitch
 *   offsets (-12 to +12 semitones) and caches the results so each
 *   asset is only resampled once per session.
 *
 * All methods are static; the class is never instantiated.
 *
 * @class Sounds
 */
var com_watabou_sevendrl_Sounds = function() { };

$hxClasses["com.watabou.sevendrl.Sounds"] = com_watabou_sevendrl_Sounds;
com_watabou_sevendrl_Sounds.__name__ = "com.watabou.sevendrl.Sounds";

/**
 * Play a one-shot sound event.
 *
 * Retrieves the resampled variant of the asset at the given pitch offset
 * and plays it immediately with the specified volume.
 *
 * @param {string}  id     - Asset path of the sound to play.
 * @param {number}  [vol=1.0] - Playback volume (0.0 – 1.0).
 * @param {number}  [offset=0] - Pitch offset in semitones (-12 to +12).
 *   0 means the original pitch.
 * @returns {void}
 */
com_watabou_sevendrl_Sounds.event = function(id,vol,offset) {
	if(offset == null) {
		offset = 0;
	}
	if(vol == null) {
		vol = 1.0;
	}

	// Only create a SoundTransform when volume differs from default to
	// avoid unnecessary object allocation.
	var st = vol == 1.0 ? null : new openfl_media_SoundTransform(vol);
	// ╔══ EXTENSION POINT: [Audio] ──────────────────────────────────
	// ║ What: SWAP POINT for sound effects
	// ║ How:  Replace or wrap the play() call below with custom SFX
	// ║       logic: spatial audio, reverb, layered sounds, or a
	// ║       different audio backend (Howler.js, Web Audio API).
	// ╚═════════════════════════════════════════════════════════════════
	com_watabou_sevendrl_Sounds.getResampled(id,offset).play(null,null,st);
};

/**
 * Switch the ambient / environmental background loop.
 *
 * If a different ambient sound is already playing it is faded out
 * smoothly, then the new sound is loaded, looped 1000 times (effectively
 * infinite), and optionally faded in.
 *
 * Passing `null` for `id` simply stops the current ambient sound.
 *
 * @param {string|null} id    - Asset path of the ambient sound, or `null`
 *   to stop the current ambient loop.
 * @param {boolean}     [fade=true] - Whether to apply a fade-in transition
 *   when starting the new ambient sound.
 * @returns {void}
 */
com_watabou_sevendrl_Sounds.enviro = function(id,fade) {
	if(fade == null) {
		fade = true;
	}

	// No-op if the requested ambient sound is already the active one.
	if(com_watabou_sevendrl_Sounds.enviroID == id) {
		return;
	}

	// Fade out the previous ambient loop if one was playing.
	if(com_watabou_sevendrl_Sounds.enviroChannel != null) {
		com_watabou_sevendrl_Sounds.fadeOut(com_watabou_sevendrl_Sounds.enviroChannel);
	}

	com_watabou_sevendrl_Sounds.enviroID = id;

	if(id != null) {
		// Start the new ambient sound looped (1000 repetitions ≈ infinite).
		// ╔══ EXTENSION POINT: [Audio] ──────────────────────────────────
		// ║ What: Ambient audio swap
		// ║ How:  Replace the play/loop call below with a custom ambient
		// ║       system: crossfading layers, adaptive music, or streamed
		// ║       audio. You can also add zone-based ambient triggers.
		// ╚═════════════════════════════════════════════════════════════════
		com_watabou_sevendrl_Sounds.enviroChannel = openfl_utils_Assets.getSound(id).play(0.0,1000);
		if(fade) {
			com_watabou_sevendrl_Sounds.fadeIn(com_watabou_sevendrl_Sounds.enviroChannel);
		}
	} else {
		// No new ambient requested — clear the channel reference.
		com_watabou_sevendrl_Sounds.enviroChannel = null;
	}
};

/**
 * Smoothly fade out a sound channel over 1 second, then stop playback.
 *
 * Uses the engine's Tweener to interpolate volume from 1.0 to 0.0.
 *
 * @param {openfl_media_SoundChannel} ch - The channel to fade out and stop.
 * @returns {void}
 */
com_watabou_sevendrl_Sounds.fadeOut = function(ch) {
	var st = new openfl_media_SoundTransform();

	// Tween `e` from 0 → 1 over 1 second; volume = 1 - e (1.0 → 0.0).
	com_watabou_processes_Tweener.run(1.0,function(e) {
		st.volume = 1 - e;
		ch.set_soundTransform(st);
	}).onComplete(function() {
		ch.stop();
	});
};

/**
 * Smoothly fade in a sound channel over 1 second (volume 0.0 → 1.0).
 *
 * @param {openfl_media_SoundChannel} ch - The channel to fade in.
 * @returns {void}
 */
com_watabou_sevendrl_Sounds.fadeIn = function(ch) {
	var st = new openfl_media_SoundTransform();

	// Tween `e` from 0 → 1 over 1 second; volume = e (0.0 → 1.0).
	com_watabou_processes_Tweener.run(1.0,function(e) {
		st.volume = e;
		ch.set_soundTransform(st);
	});
};

/**
 * Return a pitch-shifted copy of a sound asset, caching the results.
 *
 * The first time a given `id` is requested with a non-zero offset, 25
 * variants (offsets -12 through +12) are generated by adjusting the
 * sample rate of the audio buffer by `2^(semitones/12)` — the standard
 * equal-temperament ratio.  Subsequent calls return the cached variant
 * immediately.
 *
 * An offset of 0 always returns the original unmodified asset.
 *
 * @param {string} id     - Asset path of the sound to resample.
 * @param {number} [offset=0] - Pitch shift in semitones (-12 to +12).
 *   Negative values lower the pitch; positive values raise it.
 * @returns {openfl_media_Sound} The resampled (or original) sound object.
 */
com_watabou_sevendrl_Sounds.getResampled = function(id,offset) {
	if(offset == null) {
		offset = 0;
	}

	// Check the cache first.
	var sounds = com_watabou_sevendrl_Sounds.resampled.h[id];
	// ╔══ EXTENSION POINT: [Audio] ──────────────────────────────────
	// ║ What: Audio processing hook
	// ║ How:  Intercept or replace the pitch-shifting cache logic
	// ║       below. You can add effects (reverb, distortion, EQ),
	// ║       use a different resampling algorithm, or load from a
	// ║       pre-processed audio bank.
	// ╚═════════════════════════════════════════════════════════════════
	if(sounds != null) {
		// Cache hit — return the pre-computed variant at this offset.
		// Array index: offset + 12 maps [-12..+12] to [0..24].
		return sounds[offset + 12];
	} else {
		// Cache miss — load the original asset.
		var sound = openfl_utils_Assets.getSound(id);

		// If no pitch shift is requested, or the buffer data is unavailable
		// (e.g. streaming audio), return the original sound as-is.
		if(offset == 0 || sound.__buffer.data == null) {
			return sound;
		} else {
			// Generate all 25 pitch-shifted variants and store them.
			var this1 = com_watabou_sevendrl_Sounds.resampled;
			var _g = [];
			var _g1 = -12;
			while(_g1 < 13) {
				var i = _g1++;

				// Create a new audio buffer with a resampled rate.
				// The formula `rate * 2^(i/12)` shifts pitch by `i` semitones
				// while keeping the same PCM data (speed change is the
				// intended pitch-shifting mechanism).
				var srcBuffer = sound.__buffer;
				var resBuffer = new lime_media_AudioBuffer();
				resBuffer.bitsPerSample = srcBuffer.bitsPerSample;
				resBuffer.channels = srcBuffer.channels;
				resBuffer.data = srcBuffer.data;
				resBuffer.sampleRate = srcBuffer.sampleRate * Math.pow(2,i / 12) | 0;
				_g.push(openfl_media_Sound.fromAudioBuffer(resBuffer));
			}
			sounds = _g;

			// Store the full set of 25 variants in the cache.
			var v = sounds;
			this1.h[id] = v;

			// Return the variant at the requested offset.
			return sounds[offset + 12];
		}
	}
};

// -- Static initializers relocated from runtime/base.js (modules/DECISIONS.md, Bug E) --
com_watabou_sevendrl_Sounds.FADE_TIME = 1.0;
com_watabou_sevendrl_Sounds.resampled = new haxe_ds_StringMap();


// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_sevendrl_Sounds = com_watabou_sevendrl_Sounds;



// ═══ END modules/core/audio.js ═══
