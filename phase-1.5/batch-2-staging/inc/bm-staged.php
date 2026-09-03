<?php
/**
 * Bricks Marvella — Phase 1.5 BATCH 2 (STAGING ONLY — functional surface).
 *
 * DO NOT install on production before a staging pass. Everything here REMOVES
 * or REPLACES something the page currently loads, so failures can be silent:
 * a form that still renders but no longer submits, an icon that vanishes, a
 * font that falls back. Batch 1 (bm-core.php) carries the whole CLS win and
 * has none of this risk — ship that first.
 *
 * INSTALL (staging)  copy inc/ and assets/ into wp-content/themes/aalto-child/,
 *                    then add BELOW the batch-1 line in functions.php:
 *                        require get_stylesheet_directory() . '/inc/bm-staged.php';
 * REMOVE             delete that line.
 *
 * Requires batch 1 to be installed (it owns the reservations and the poster).
 */

if (!defined('ABSPATH')) { exit; }

define('BM_STAGED_VER', '1.5.0');

function bm_staged_is_target() {
	return function_exists('bm_core_is_target') ? bm_core_is_target() : is_front_page();
}

/* -------------------------------------------------------------------------
 * 1. Dequeues.
 *
 *   multiscroll ............. fullscreen-split module; no callers on this page
 *   wp-components / wp-preferences / wp-block-editor ... editor-UI CSS on a
 *                             WPBakery front end
 *   dripicons / simple-line-icons / linear-icons ... icon families with ZERO
 *                             referenced glyphs in the rendered DOM
 *
 * NOT dequeued: nicescroll. The theme calls jQuery(...).niceScroll()
 * unconditionally; removing the library throws "t.niceScroll is not a
 * function" and the handler dies. Revisit with the Phase 4 scroll decision.
 * ---------------------------------------------------------------------- */
add_action('wp_enqueue_scripts', function () {
	if (!bm_staged_is_target()) { return; }

	wp_dequeue_script('multiscroll');

	foreach (array(
		'wp-components', 'wp-preferences', 'wp-block-editor',
		'edgtf-dripicons', 'edgtf-simple-line-icons', 'edgtf-linear-icons',
	) as $h) {
		wp_dequeue_style($h);
		wp_deregister_style($h);
	}

	bm_staged_dequeue_font_css();

	$base = get_stylesheet_directory_uri() . '/assets';
	wp_enqueue_style('bm-staged', $base . '/bm-staged.css', array('bm-core'), BM_STAGED_VER);
	wp_enqueue_script('bm-staged', $base . '/bm-staged.js', array(), BM_STAGED_VER, array('strategy' => 'defer', 'in_footer' => true));
}, 22);

/**
 * Google-fonts CSS: replaced by self-hosted WOFF2 in bm-staged.css.
 * (Abril Fatface only ever served the display:none SEO h1 — Phase 4 makes that
 * headline visible, at which point the new display face replaces it outright.)
 * These handles are re-enqueued during shortcode render, so dequeue twice.
 */
function bm_staged_dequeue_font_css() {
	foreach (array(
		'aalto-edge-google-fonts',
		'vc_google_fonts_abril_fatfaceregular',
		'vc_google_fonts_roboto_condensed300300italicregularitalic700700italic',
	) as $h) {
		wp_dequeue_style($h);
		wp_deregister_style($h);
	}
}
add_action('wp_footer', function () {
	if (bm_staged_is_target()) { bm_staged_dequeue_font_css(); }
}, 1);

/* -------------------------------------------------------------------------
 * 2. Preload the two text fonts every view renders.
 * ---------------------------------------------------------------------- */
add_action('wp_head', function () {
	if (!bm_staged_is_target()) { return; }
	$base = get_stylesheet_directory_uri() . '/assets';
	echo '<link rel="preload" as="font" type="font/woff2" crossorigin href="' . esc_url($base . '/fonts/RobotoCondensed-var.woff2') . '">' . "\n";
	echo '<link rel="preload" as="font" type="font/woff2" crossorigin href="' . esc_url($base . '/fonts/Roboto-var.woff2') . '">' . "\n";
}, 4);
