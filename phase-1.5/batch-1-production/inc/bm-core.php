<?php
/**
 * Bricks Marvella — Phase 1.5 BATCH 1 (production-safe).
 *
 * Scope: layout reservations, the shine-animation fix, stylesheet ordering,
 * LCP priority, alt text, poster preload. NOTHING here removes a script, a
 * stylesheet, or a plugin behaviour — every change is additive, visually
 * neutral, and reversible by deleting one require line.
 *
 * INSTALL  copy inc/ and assets/ into wp-content/themes/aalto-child/ then add
 *          to that theme's functions.php:
 *              require get_stylesheet_directory() . '/inc/bm-core.php';
 * REMOVE   delete that line.
 *
 * Verified on a DOM-identical testbed: CLS 0.915 -> 0.0000 (mobile),
 * zero JS exceptions, page height byte-identical. See ../MEASUREMENTS.md.
 */

if (!defined('ABSPATH')) { exit; }

define('BM_CORE_VER', '1.5.0');

/**
 * Hero poster URL — paste the Media Library URL of hero-poster.webp here
 * (Deploy step 3). Empty = no preload emitted, everything else still works.
 */
define('BM_CORE_POSTER_URL', '');

function bm_core_is_target() {
	return is_front_page();
}

/* -------------------------------------------------------------------------
 * 1. Stylesheet: layout reservations
 * ---------------------------------------------------------------------- */
add_action('wp_enqueue_scripts', function () {
	if (!bm_core_is_target()) { return; }
	wp_enqueue_style('bm-core', get_stylesheet_directory_uri() . '/assets/bm-core.css', array(), BM_CORE_VER);
}, 20);

/* -------------------------------------------------------------------------
 * 2. Head-hoist stylesheets WordPress otherwise prints in the FOOTER.
 *
 * These handles are enqueued during shortcode render, so WP emits them after
 * the content — their late arrival re-metrics the page (measured: a -10px
 * whole-document settle, 0.011-0.18 CLS depending on timing). Enqueueing them
 * here prints the same files in <head>, before first paint.
 *
 * Additive only: same stylesheets, same URLs, earlier position.
 * ---------------------------------------------------------------------- */
add_action('wp_enqueue_scripts', function () {
	if (!bm_core_is_target()) { return; }
	foreach (array('rs-plugin-settings', 'vc_tta_style', 'lightbox2', 'vc_animate-css') as $h) {
		if (wp_style_is($h, 'registered') && !wp_style_is($h, 'enqueued')) {
			wp_enqueue_style($h);
		}
	}
}, 21);

/* -------------------------------------------------------------------------
 * 3. "shine" sweep: #wp-custom-css animates `left` 800ms/loop, forever, on
 *    four CTA ::before elements — an infinite LAYOUT animation (unbounded CLS
 *    + continuous layout thrash). Same visual sweep, re-declared as a
 *    compositor transform. Printed at priority 999 so it follows
 *    #wp-custom-css (priority 101) in document order and wins on equal
 *    specificity. Adds a reduced-motion opt-out.
 * ---------------------------------------------------------------------- */
add_action('wp_head', function () {
	if (!bm_core_is_target()) { return; }
	?>
<style id="bm-shine-fix">@keyframes shine{0%{transform:translateX(0)}40%,100%{transform:translateX(720px)}}#slider-15-slide-28-layer-8 a,#slider-15-slide-28-layer-26 a,#slider-15-slide-28-layer-20 a,.button-style-animation{overflow:hidden}#slider-15-slide-28-layer-8 a:before,.button-style-animation:before,#slider-15-slide-28-layer-26 a:before,#slider-15-slide-28-layer-20 a:before{left:-100px;animation:shine 800ms infinite linear!important}@media (prefers-reduced-motion:reduce){#slider-15-slide-28-layer-8 a:before,.button-style-animation:before,#slider-15-slide-28-layer-26 a:before,#slider-15-slide-28-layer-20 a:before{animation:none!important}}</style>
	<?php
}, 999);

/* -------------------------------------------------------------------------
 * 4. Poster preload — the intended LCP element.
 * ---------------------------------------------------------------------- */
add_action('wp_head', function () {
	if (!bm_core_is_target() || BM_CORE_POSTER_URL === '') { return; }
	echo '<link rel="preload" as="image" href="' . esc_url(BM_CORE_POSTER_URL) . '" fetchpriority="high">' . "\n";
}, 3);

/* -------------------------------------------------------------------------
 * 5. Strip fetchpriority="high" from the below-fold 600x600 drone thumbnail
 *    (WP core guessed it as the LCP; the poster above is the real one).
 * ---------------------------------------------------------------------- */
add_filter('the_content', function ($html) {
	if (bm_core_is_target()) {
		$html = preg_replace('/(<img[^>]*DJI_0210-600x600[^>]*?)\s+fetchpriority=["\']high["\']/i', '$1', $html);
	}
	return $html;
}, 99);

/* -------------------------------------------------------------------------
 * 6. Alt text.
 *
 * Preferred fix is the Media Library (see ALT-TEXT.md) — that repairs alt
 * everywhere site-wide and survives any theme change. This filter is the
 * safety net: it fills alt for images matching a filename, and only where the
 * attribute is missing or empty, so Media Library values always win.
 *
 * Deliberately empty ('') for decorative images: WCAG requires an empty alt on
 * decoration, not a description.
 * ---------------------------------------------------------------------- */
function bm_core_alt_map() {
	return array(
		// --- brand marks ---
		'Bricks_Logo-Revised-02'        => 'Bricks Ramabhupal Projects',
		'MARVELLA_FINAL-LOGOs-05'       => 'Bricks Marvella',
		'MARVELLAFINAL-LOGOs-03'        => 'Bricks Marvella',
		'bricks-ramabhupal-projects'    => 'Bricks Ramabhupal Projects',
		'marvella-flate-logo'           => 'Bricks Marvella',
		// --- decorative UI icons: empty alt is the correct value ---
		'rupee.png'                     => '',
		'phone.png'                     => '',
		'dummy.png'                     => '',
		// --- aerial / drone ---
		'DJI_0210' => 'Aerial view of the Bricks Marvella towers beside the lake at Tellapur',
		'DJI_0217' => 'Aerial view of Bricks Marvella against the Tellapur skyline',
		'DJI_0272' => 'Aerial view of Bricks Marvella looking towards the Financial District',
		'DJI_0208' => 'Aerial view of the landscaped open space around Bricks Marvella',
		// --- amenities ---
		'Amphitheatre'                  => 'Open-air amphitheatre at the Bricks Marvella clubhouse',
		'banquet-hall'                  => 'Banquet hall at the Bricks Marvella clubhouse',
		'children-play-area'            => "Children's play area at Bricks Marvella",
		'Camera013'                     => 'Basketball court at Bricks Marvella',
		'yoga-1100x550'                 => 'Meditation and yoga centre at Bricks Marvella',
		'indoor-games-01'               => 'Indoor games room at the Bricks Marvella clubhouse',
		'yoga-01'                       => 'Gymnasium and spa at Bricks Marvella',
		'cycling-and-jogging-track'     => 'Cycling and jogging track through the Bricks Marvella grounds',
		'Cricket-Pratice-pitch'         => 'Cricket practice pitch at Bricks Marvella',
		// --- plans (numbering follows the source filenames; confirm wording with the client) ---
		'master-plan'      => 'Bricks Marvella master plan: two towers, clubhouse and landscaped open space across 4.5 acres',
		'plan-a-1-2'       => 'Bricks Marvella Tower A floor plan, sheet 1-2',
		'plan-4-5-6'       => 'Bricks Marvella Tower A floor plan, sheet 4-5-6',
		'plan-6-7'         => 'Bricks Marvella Tower A floor plan, sheet 6-7',
		'plan-a-8-9'       => 'Bricks Marvella Tower A floor plan, sheet 8-9',
		'plan-b-1-2'       => 'Bricks Marvella Tower B floor plan, sheet 1-2',
		'plan-b-3-4'       => 'Bricks Marvella Tower B floor plan, sheet 3-4',
		'plan-b-5-6'       => 'Bricks Marvella Tower B floor plan, sheet 5-6',
		'lan-b-7-8'        => 'Bricks Marvella Tower B floor plan, sheet 7-8', // file is "Plan-b-7-8" (capital P)
	);
}

/** Attachment path: applies wherever WP builds the <img> itself. */
add_filter('wp_get_attachment_image_attributes', function ($attr, $attachment) {
	if (!empty($attr['alt'])) { return $attr; }
	$src = isset($attr['src']) ? $attr['src'] : wp_get_attachment_url($attachment->ID);
	foreach (bm_core_alt_map() as $needle => $alt) {
		if ($src && stripos($src, $needle) !== false) { $attr['alt'] = $alt; return $attr; }
	}
	return $attr;
}, 10, 2);

/**
 * Is this existing alt value worth keeping? No, if it is blank or is really a
 * filename — "bricks-marvellas-amenities-cycling-...-1080x550" (audit rows
 * 24-26). Anything a human wrote is kept.
 */
function bm_core_alt_is_junk($alt) {
	$alt = trim($alt);
	if ($alt === '') { return true; }
	return (bool) preg_match('/\.(jpe?g|png|webp|gif)$/i', $alt)   // ends in a file extension
		|| (bool) preg_match('/\d{3,4}x\d{3,4}/', $alt)             // carries a WP size suffix
		|| stripos($alt, '-scaled') !== false;                      // carries WP's -scaled marker
}

/**
 * Rendered-content path: theme shortcodes emit their own <img> markup, and
 * LiteSpeed rewrites src -> data-src, so match on the whole tag.
 * Rule: replace alt only when the current one is junk; otherwise leave it.
 */
add_filter('the_content', function ($html) {
	if (!bm_core_is_target()) { return $html; }
	$map = bm_core_alt_map();
	return preg_replace_callback('/<img\b[^>]*>/i', function ($m) use ($map) {
		$tag = $m[0];
		$has_alt = preg_match('/\salt=(["\'])(.*?)\1/is', $tag, $a);
		if ($has_alt && !bm_core_alt_is_junk($a[2])) { return $tag; }

		$new = null;
		foreach ($map as $needle => $alt) {
			if (stripos($tag, $needle) !== false) { $new = $alt; break; }
		}
		// unmapped image: at least guarantee the attribute exists
		if ($new === null) { $new = $has_alt ? $a[2] : ''; }

		$esc = esc_attr($new);
		return $has_alt
			? preg_replace('/\salt=(["\']).*?\1/is', ' alt="' . $esc . '"', $tag, 1)
			: preg_replace('/<img\b/i', '<img alt="' . $esc . '"', $tag, 1);
	}, $html);
}, 100);
