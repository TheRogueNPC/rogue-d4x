// ================================================================
// GEOM - modules/watabou/geom.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: Color, GeomUtils, Rect
//
// Geometry and color utilities ported from the Watabou/Haxe roguelike
// framework (com.watabou.geom). Provides color manipulation in packed
// integer format, 2-D geometry helpers, and an axis-aligned bounding
// rectangle used throughout the Dark Clues engine.
// ================================================================

// --- Color (com.watabou.geom.Color) --- line 4356 ---
/**
 * Static utility class for manipulating colors packed into 32-bit
 * integers using the 0xRRGGBB layout (alpha channel is not used).
 *
 * All colours are stored as plain integers, e.g. pure red is 0xFF0000.
 * Conversion helpers exist for going the other direction (RGB floats
 * to packed int, HSV <-> RGB, etc.).
 *
 * @class
 */
var com_watabou_geom_Color = function() { };
$hxClasses["com.watabou.geom.Color"] = com_watabou_geom_Color;
com_watabou_geom_Color.__name__ = "com.watabou.geom.Color";

/**
 * Pack integer RGB values into a single 0xRRGGBB color.
 *
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {number} Packed color integer, e.g. 0xFF0000 for pure red
 */
com_watabou_geom_Color.rgb = function(r,g,b) {
	return r << 16 | g << 8 | b;
};

/**
 * Pack floating-point RGB values (0.0-1.0) into a 0xRRGGBB integer.
 * Values are truncated (not rounded) after scaling to 0-255.
 *
 * @param {number} r - Red component (0.0-1.0)
 * @param {number} g - Green component (0.0-1.0)
 * @param {number} b - Blue component (0.0-1.0)
 * @returns {number} Packed color integer
 */
com_watabou_geom_Color.rgbf = function(r,g,b) {
	return (r * 255 | 0) << 16 | (g * 255 | 0) << 8 | (b * 255 | 0);
};

/**
 * Like rgbf but clamps each channel to the valid 0-255 range first.
 * Safe for values that may go below 0 or above 1 (e.g. after HDR
 * blending).
 *
 * @param {number} r - Red component (may be outside 0-1)
 * @param {number} g - Green component (may be outside 0-1)
 * @param {number} b - Blue component (may be outside 0-1)
 * @returns {number} Packed color integer with channels clamped to 0-255
 */
com_watabou_geom_Color.rgbfSafe = function(r,g,b) {
	return (com_watabou_utils_MathUtils.gate(r * 255,0,255) | 0) << 16 | (com_watabou_utils_MathUtils.gate(g * 255,0,255) | 0) << 8 | (com_watabou_utils_MathUtils.gate(b * 255,0,255) | 0);
};

/**
 * Extract the red channel from a packed color as an integer 0-255.
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {number} Red component (0-255)
 */
com_watabou_geom_Color.red = function(c) {
	return c >>> 16;
};

/**
 * Extract the green channel from a packed color as an integer 0-255.
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {number} Green component (0-255)
 */
com_watabou_geom_Color.green = function(c) {
	return c >>> 8 & 255;
};

/**
 * Extract the blue channel from a packed color as an integer 0-255.
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {number} Blue component (0-255)
 */
com_watabou_geom_Color.blue = function(c) {
	return c & 255;
};

/**
 * Extract the red channel as a float in the range 0.0-1.0.
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {number} Red component (0.0-1.0)
 */
com_watabou_geom_Color.redf = function(c) {
	return UInt.toFloat(c >>> 16) / UInt.toFloat(255);
};

/**
 * Extract the green channel as a float in the range 0.0-1.0.
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {number} Green component (0.0-1.0)
 */
com_watabou_geom_Color.greenf = function(c) {
	return UInt.toFloat(c >>> 8 & 255) / UInt.toFloat(255);
};

/**
 * Extract the blue channel as a float in the range 0.0-1.0.
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {number} Blue component (0.0-1.0)
 */
com_watabou_geom_Color.bluef = function(c) {
	return UInt.toFloat(c & 255) / UInt.toFloat(255);
};

/**
 * Linearly interpolate between two packed colors in RGB space.
 *
 * @param {number} c1 - First color (0xRRGGBB)
 * @param {number} c2 - Second color (0xRRGGBB)
 * @param {number} [t1=0.5] - Interpolation factor (0.0 = c1, 1.0 = c2)
 * @returns {number} Blended packed color
 */
com_watabou_geom_Color.lerp = function(c1,c2,t1) {
	if(t1 == null) {
		t1 = 0.5;
	}
	// Decompose first color into R, G, B
	var r1 = c1 >>> 16;
	var g1 = c1 >>> 8 & 255;
	var b1 = c1 & 255;
	// Decompose second color into R, G, B
	var r2 = c2 >>> 16;
	var g2 = c2 >>> 8 & 255;
	var b2 = c2 & 255;
	// Inverse interpolation weight
	var t2 = 1 - t1;
	// Blend each channel and re-pack
	return (UInt.toFloat(r1) * t2 + UInt.toFloat(r2) * t1 | 0) << 16 | (UInt.toFloat(g1) * t2 + UInt.toFloat(g2) * t1 | 0) << 8 | (UInt.toFloat(b1) * t2 + UInt.toFloat(b2) * t1 | 0);
};

/**
 * Linearly interpolate between two colors in HSV space.
 * This produces more perceptually smooth gradients than RGB lerp.
 * If either color has zero saturation, the hue of the other is used.
 *
 * @param {number} c1 - First color (0xRRGGBB)
 * @param {number} c2 - Second color (0xRRGGBB)
 * @param {number} [t1=0.5] - Interpolation factor (0.0 = c1, 1.0 = c2)
 * @returns {number} Blended packed color in HSV space
 */
com_watabou_geom_Color.lerpHSV = function(c1,c2,t1) {
	if(t1 == null) {
		t1 = 0.5;
	}
	// Convert both colors to HSV
	var hsv1 = com_watabou_geom_Color.rgb2hsv(c1);
	var hsv2 = com_watabou_geom_Color.rgb2hsv(c2);
	// Interpolate hue along shortest arc; if either is achromatic use the other's hue
	var hue = hsv1.y == 0 ? hsv2.x : hsv2.y == 0 ? hsv1.x : com_watabou_geom_Color.lerpHue(hsv1.x,hsv2.x,t1);
	var t2 = 1 - t1;
	// Interpolate saturation and value linearly, then convert back to RGB
	return com_watabou_geom_Color.hsv(hue,hsv1.y * t2 + hsv2.y * t1,hsv1.z * t2 + hsv2.z * t1);
};

/**
 * Interpolate between two hue values (in degrees, 0-360) along the
 * shorter arc of the hue wheel. Normalises inputs so that the
 * interpolation always takes the shortest path around the circle.
 *
 * @param {number} h1 - First hue in degrees (0-360)
 * @param {number} h2 - Second hue in degrees (0-360)
 * @param {number} [ratio=0.5] - Interpolation factor (0.0 = h1, 1.0 = h2)
 * @returns {number} Interpolated hue value in degrees
 */
com_watabou_geom_Color.lerpHue = function(h1,h2,ratio) {
	if(ratio == null) {
		ratio = 0.5;
	}
	// Normalise h1 to [0, 360)
	h1 -= 360 * Math.floor(h1 / 360);
	// Normalise h2 relative to the normalised h1
	h2 -= 360 * Math.floor(h1 / 360);
	// Ensure h1 <= h2; swap and invert ratio if needed
	if(h1 > h2) {
		var h = h1;
		h1 = h2;
		h2 = h;
		ratio = 1 - ratio;
	}
	// If the gap is > 180 degrees, go the short way around
	if(h2 - h1 > 180) {
		h2 -= 360;
	}
	return h1 * (1 - ratio) + h2 * ratio;
};

/**
 * Generate an array of packed colors forming a smooth gradient from
 * c1 to c2 using HSV interpolation.
 *
 * @param {number} c1 - Start color (0xRRGGBB)
 * @param {number} c2 - End color (0xRRGGBB)
 * @param {number} [size=256] - Number of gradient steps to produce
 * @returns {number[]} Array of packed colors, length === size
 */
com_watabou_geom_Color.gradient = function(c1,c2,size) {
	if(size == null) {
		size = 256;
	}
	var _g = [];
	var _g1 = 0;
	var _g2 = size;
	while(_g1 < _g2) {
		var i = _g1++;
		_g.push(com_watabou_geom_Color.lerpHSV(c1,c2,i / (size - 1)));
	}
	return _g;
};

/**
 * Scale (brighten or darken) a color by a uniform multiplier.
 * Uses clamped-safe conversion so values outside 0-1 are handled.
 *
 * @param {number} c - Packed color (0xRRGGBB)
 * @param {number} t - Multiplier (1.0 = unchanged, <1 darker, >1 brighter)
 * @returns {number} Scaled packed color
 */
com_watabou_geom_Color.scale = function(c,t) {
	return com_watabou_geom_Color.rgbfSafe(UInt.toFloat(c >>> 16) / UInt.toFloat(255) * t,UInt.toFloat(c >>> 8 & 255) / UInt.toFloat(255) * t,UInt.toFloat(c & 255) / UInt.toFloat(255) * t);
};

/**
 * Multiply two colors channel-wise (component-wise product).
 * Useful for applying tint or color filters.
 *
 * @param {number} c1 - First color (0xRRGGBB)
 * @param {number} c2 - Second color (0xRRGGBB)
 * @returns {number} Product of the two colors
 */
com_watabou_geom_Color.multiply = function(c1,c2) {
	return com_watabou_geom_Color.rgbf(UInt.toFloat(c1 >>> 16) / UInt.toFloat(255) * (UInt.toFloat(c2 >>> 16) / UInt.toFloat(255)),UInt.toFloat(c1 >>> 8 & 255) / UInt.toFloat(255) * (UInt.toFloat(c2 >>> 8 & 255) / UInt.toFloat(255)),UInt.toFloat(c1 & 255) / UInt.toFloat(255) * (UInt.toFloat(c2 & 255) / UInt.toFloat(255)));
};

/**
 * Add two colors channel-wise (additive blending).
 * Channels are clamped to 0-255 via rgbfSafe.
 *
 * @param {number} c1 - First color (0xRRGGBB)
 * @param {number} c2 - Second color (0xRRGGBB)
 * @returns {number} Sum of the two colors, clamped per channel
 */
com_watabou_geom_Color.add = function(c1,c2) {
	return com_watabou_geom_Color.rgbfSafe(UInt.toFloat(c1 >>> 16) / UInt.toFloat(255) + UInt.toFloat(c2 >>> 16) / UInt.toFloat(255),UInt.toFloat(c1 >>> 8 & 255) / UInt.toFloat(255) + UInt.toFloat(c2 >>> 8 & 255) / UInt.toFloat(255),UInt.toFloat(c1 & 255) / UInt.toFloat(255) + UInt.toFloat(c2 & 255) / UInt.toFloat(255));
};

/**
 * Convert HSV (Hue-Saturation-Value) to a packed 0xRRGGBB color.
 *
 * @param {number} h - Hue in degrees (0-360)
 * @param {number} s - Saturation (0.0-1.0)
 * @param {number} v - Value / brightness (0.0-1.0)
 * @returns {number} Packed RGB color
 */
com_watabou_geom_Color.hsv = function(h,s,v) {
	// Helper: maps a hue offset to a 0-1 "level" using a triangle wave
	var level = function(h) {
		h -= 360 * Math.floor(h / 360);
		return com_watabou_utils_MathUtils.gate(Math.abs(h / 60 - 3) - 1,0,1);
	};
	// Compute base R, G, B from hue using the level function at 120-degree offsets
	var r = level(h);
	var g = level(h - 120);
	var b = level(h + 120);
	// Apply saturation and value
	r = (r * s + 1 - s) * v;
	g = (g * s + 1 - s) * v;
	b = (b * s + 1 - s) * v;
	return com_watabou_geom_Color.rgbfSafe(r,g,b);
};

/**
 * Convert a packed 0xRRGGBB color to HSV, returned as a Vector3D
 * with x=hue (degrees), y=saturation (0-1), z=value (0-1).
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {openfl_geom_Vector3D} Vector3D(hue, saturation, value)
 */
com_watabou_geom_Color.rgb2hsv = function(c) {
	// Decompose to [0,1] floats
	var r = UInt.toFloat(c >>> 16) / UInt.toFloat(255);
	var g = UInt.toFloat(c >>> 8 & 255) / UInt.toFloat(255);
	var b = UInt.toFloat(c & 255) / UInt.toFloat(255);
	var min = Math.min(r,Math.min(g,b));
	var max = Math.max(r,Math.max(g,b));
	// Achromatic: hue and saturation are zero, value = min = max
	if(min == max) {
		return new openfl_geom_Vector3D(0,0,min);
	}
	// Determine which channel is max to compute hue sector
	var d = r == min ? g - b : b == min ? r - g : b - r;
	var h = r == min ? 3 : b == min ? 1 : 5;
	return new openfl_geom_Vector3D(60 * (h - d / (max - min)),(max - min) / max,max);
};

/**
 * Convert a packed 0xRRGGBB color to a Vector3D with each component
 * in the range 0.0-1.0 (x=red, y=green, z=blue).
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {openfl_geom_Vector3D} Vector3D(red, green, blue) as floats
 */
com_watabou_geom_Color.rgb2vec = function(c) {
	return new openfl_geom_Vector3D(UInt.toFloat(c >>> 16) / UInt.toFloat(255),UInt.toFloat(c >>> 8 & 255) / UInt.toFloat(255),UInt.toFloat(c & 255) / UInt.toFloat(255));
};

/**
 * Compute the perceptual brightness of a color using ITU-R BT.601
 * luminance weights: sqrt(0.299*R^2 + 0.587*G^2 + 0.114*B^2).
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {number} Perceived brightness in the range 0.0-1.0
 */
com_watabou_geom_Color.brightness = function(c) {
	var r = UInt.toFloat(c >>> 16) / UInt.toFloat(255);
	var g = UInt.toFloat(c >>> 8 & 255) / UInt.toFloat(255);
	var b = UInt.toFloat(c & 255) / UInt.toFloat(255);
	return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
};

/**
 * Format a packed color as a 6-character uppercase hex string
 * (without a leading "0x" prefix).
 *
 * @param {number} c - Packed 0xRRGGBB color
 * @returns {string} Hex string, e.g. "FF0000"
 */
com_watabou_geom_Color.hex = function(c) {
	return StringTools.hex(c,6);
};

/**
 * Compute the Euclidean distance between two colors in normalized
 * RGB space, divided by sqrt(3) so the result is in 0.0-1.0.
 *
 * @param {number} c1 - First color (0xRRGGBB)
 * @param {number} c2 - Second color (0xRRGGBB)
 * @returns {number} Normalized distance (0.0 = identical, 1.0 = max)
 */
com_watabou_geom_Color.dist = function(c1,c2) {
	return openfl_geom_Vector3D.distance(new openfl_geom_Vector3D(UInt.toFloat(c1 >>> 16) / UInt.toFloat(255),UInt.toFloat(c1 >>> 8 & 255) / UInt.toFloat(255),UInt.toFloat(c1 & 255) / UInt.toFloat(255)),new openfl_geom_Vector3D(UInt.toFloat(c2 >>> 16) / UInt.toFloat(255),UInt.toFloat(c2 >>> 8 & 255) / UInt.toFloat(255),UInt.toFloat(c2 & 255) / UInt.toFloat(255))) / Math.sqrt(3);
};

// Static color constants. These were left behind in runtime/base.js by the
// original extraction (set on the class AFTER its definition, in a separate
// statement block) — moved here since they belong with the class itself.
// See modules/DECISIONS.md, Bug E.
com_watabou_geom_Color.BLACK = 0;
com_watabou_geom_Color.WHITE = 16777215;
com_watabou_geom_Color.GREY = 8421504;
com_watabou_geom_Color.RED = 16711680;
com_watabou_geom_Color.GREEN = 65280;
com_watabou_geom_Color.BLUE = 255;
com_watabou_geom_Color.YELLOW = 16776960;
com_watabou_geom_Color.CYAN = 65535;
com_watabou_geom_Color.MAGENTA = 16711935;

// --- GeomUtils (com.watabou.geom.GeomUtils) --- line 4489 ---
/**
 * Static utility class providing common 2-D geometry operations:
 * line/segment intersection, point interpolation, dot/cross products,
 * point-in-triangle tests, barycentric coordinates, and more.
 *
 * @class
 */
var com_watabou_geom_GeomUtils = function() { };
$hxClasses["com.watabou.geom.GeomUtils"] = com_watabou_geom_GeomUtils;
com_watabou_geom_GeomUtils.__name__ = "com.watabou.geom.GeomUtils";

/**
 * Find the intersection parameters of two infinite lines.
 *
 * Each line is defined by a point (x, y) and a direction vector
 * (dx, dy). The returned Point contains the parametric values
 * (t1, t2) such that:
 *   line1 point = (x1 + dx1*t1, y1 + dy1*t1)
 *   line2 point = (x2 + dx2*t2, y2 + dy2*t2)
 *
 * Returns null if the lines are parallel (cross product of
 * direction vectors is zero).
 *
 * @param {number} x1 - Start x of line 1
 * @param {number} y1 - Start y of line 1
 * @param {number} dx1 - Direction x of line 1
 * @param {number} dy1 - Direction y of line 1
 * @param {number} x2 - Start x of line 2
 * @param {number} y2 - Start y of line 2
 * @param {number} dx2 - Direction x of line 2
 * @param {number} dy2 - Direction y of line 2
 * @returns {openfl_geom_Point|null} Point(t1, t2) or null if parallel
 */
com_watabou_geom_GeomUtils.intersectLines = function(x1,y1,dx1,dy1,x2,y2,dx2,dy2) {
	// Cross product of direction vectors; zero means parallel
	var d = dx1 * dy2 - dy1 * dx2;
	if(d == 0) {
		return null;
	}
	// Parametric distance along line 2 to intersection
	var t2 = (dy1 * (x2 - x1) - dx1 * (y2 - y1)) / d;
	// Parametric distance along line 1 (pick the less noisy axis)
	var t1 = Math.abs(dx1) > Math.abs(dy1) ? (x2 - x1 + dx2 * t2) / dx1 : (y2 - y1 + dy2 * t2) / dy1;
	return new openfl_geom_Point(t1,t2);
};

/**
 * Test whether two finite line segments intersect.
 *
 * Each segment is defined by a start point (x, y) and a direction
 * vector (dx, dy). The segment spans from the start point to
 * start + direction (parametric range 0 to 1). Returns true only
 * if both parametric intersection values lie within [0, 1].
 *
 * @param {number} x1 - Start x of segment 1
 * @param {number} y1 - Start y of segment 1
 * @param {number} dx1 - Direction x of segment 1
 * @param {number} dy1 - Direction y of segment 1
 * @param {number} x2 - Start x of segment 2
 * @param {number} y2 - Start y of segment 2
 * @param {number} dx2 - Direction x of segment 2
 * @param {number} dy2 - Direction y of segment 2
 * @returns {boolean} True if the segments intersect
 */
com_watabou_geom_GeomUtils.intersectSegments = function(x1,y1,dx1,dy1,x2,y2,dx2,dy2) {
	var t = com_watabou_geom_GeomUtils.intersectLines(x1,y1,dx1,dy1,x2,y2,dx2,dy2);
	// Check that both parametric values are in [0, 1]
	if(t != null && t.x >= 0 && t.x <= 1 && t.y >= 0) {
		return t.y <= 1;
	} else {
		return false;
	}
};

/**
 * Stub for line-vs-circle intersection testing.
 * Not yet implemented; always returns null.
 *
 * @param {number} x1 - Line start x
 * @param {number} y1 - Line start y
 * @param {number} dx1 - Line direction x
 * @param {number} dy1 - Line direction y
 * @param {number} cx - Circle center x
 * @param {number} cy - Circle center y
 * @param {number} r  - Circle radius
 * @returns {null} Always null (unimplemented)
 */
com_watabou_geom_GeomUtils.lineVsCircle = function(x1,y1,dx1,dy1,cx,cy,r) {
	return null;
};

/**
 * Linearly interpolate between two points.
 *
 * @param {openfl_geom_Point} p1 - Start point
 * @param {openfl_geom_Point} p2 - End point
 * @param {number} [ratio=0.5] - Interpolation factor (0.0 = p1, 1.0 = p2)
 * @returns {openfl_geom_Point} Interpolated point
 */
com_watabou_geom_GeomUtils.lerp = function(p1,p2,ratio) {
	if(ratio == null) {
		ratio = 0.5;
	}
	// Interpolate x
	var a = p1.x;
	var p = ratio;
	if(p == null) {
		p = 0.5;
	}
	// Interpolate y
	var a1 = p1.y;
	var p1 = ratio;
	if(p1 == null) {
		p1 = 0.5;
	}
	return new openfl_geom_Point(a + (p2.x - a) * p,a1 + (p2.y - a1) * p1);
};

/**
 * Compute the scalar (dot) product of two 2-D vectors.
 *
 * @param {number} x1 - First vector x
 * @param {number} y1 - First vector y
 * @param {number} x2 - Second vector x
 * @param {number} y2 - Second vector y
 * @returns {number} Dot product: x1*x2 + y1*y2
 */
com_watabou_geom_GeomUtils.scalar = function(x1,y1,x2,y2) {
	return x1 * x2 + y1 * y2;
};

/**
 * Compute the 2-D cross product (z-component) of two vectors.
 * Positive if v2 is counter-clockwise from v1, negative if clockwise.
 *
 * @param {number} x1 - First vector x
 * @param {number} y1 - First vector y
 * @param {number} x2 - Second vector x
 * @param {number} y2 - Second vector y
 * @returns {number} Cross product: x1*y2 - y1*x2
 */
com_watabou_geom_GeomUtils.cross = function(x1,y1,x2,y2) {
	return x1 * y2 - y1 * x2;
};

/**
 * Compute the signed distance from a point to a line.
 *
 * The line passes through (x1, y1) with direction (dx1, dy1).
 * The sign indicates which side of the line the point is on.
 *
 * @param {number} x1 - A point on the line
 * @param {number} y1 - A point on the line
 * @param {number} dx1 - Direction vector x of the line
 * @param {number} dy1 - Direction vector y of the line
 * @param {number} x0 - Test point x
 * @param {number} y0 - Test point y
 * @returns {number} Signed distance from the line
 */
com_watabou_geom_GeomUtils.distance2line = function(x1,y1,dx1,dy1,x0,y0) {
	return (dx1 * y0 - dy1 * x0 + (y1 + dy1) * x1 - (x1 + dx1) * y1) / Math.sqrt(dx1 * dx1 + dy1 * dy1);
};

/**
 * Test whether two line segments (p0->p1 and q0->q1) are collinear
 * (i.e. they lie on the same infinite line).
 *
 * Uses a tolerance of 1e-9 for floating-point comparison.
 *
 * @param {openfl_geom_Point} p0 - Start of first segment
 * @param {openfl_geom_Point} p1 - End of first segment
 * @param {openfl_geom_Point} q0 - Start of second segment
 * @param {openfl_geom_Point} q1 - End of second segment
 * @returns {boolean} True if both segments lie on the same line
 */
com_watabou_geom_GeomUtils.converge = function(p0,p1,q0,q1) {
	// Direction and cross-product offset of the first segment's line
	var dxp = p1.x - p0.x;
	var dyp = p1.y - p0.y;
	var z = p1.x * p0.y - p1.y * p0.x;
	// Check if q0 and q1 are both on the line defined by p0->p1
	if(Math.abs(dxp * q0.y - dyp * q0.x - z) < 1.e-9) {
		return Math.abs(dxp * q1.y - dyp * q1.x - z) < 1.e-9;
	} else {
		return false;
	}
};

/**
 * Test whether a point s lies inside the triangle defined by
 * vertices a, b, c using cross-product sign checks.
 *
 * @param {openfl_geom_Point} a - First triangle vertex
 * @param {openfl_geom_Point} b - Second triangle vertex
 * @param {openfl_geom_Point} c - Third triangle vertex
 * @param {openfl_geom_Point} s - Test point
 * @returns {boolean} True if s is inside triangle abc
 */
com_watabou_geom_GeomUtils.pointInsideTriangle = function(a,b,c,s) {
	var asX = s.x - a.x;
	var asY = s.y - a.y;
	var bsX = s.x - b.x;
	var bsY = s.y - b.y;
	// Determine which side of edge AB the point s is on
	var s_ab = (b.x - a.x) * asY - (b.y - a.y) * asX >= 0;
	// If s and c are on the same side of AB, point is outside
	if((c.x - a.x) * asY - (c.y - a.y) * asX >= 0 == s_ab) {
		return false;
	}
	// If s and c are on opposite sides of BC, point is outside
	if((c.x - b.x) * bsY - (c.y - b.y) * bsX >= 0 != s_ab) {
		return false;
	}
	return true;
};

/**
 * Compute the barycentric coordinates of point f with respect to
 * triangle (p1, p2, p3).
 *
 * The returned Vector3D components (x, y, z) correspond to the
 * weights for p1, p2, and p3 respectively. They sum to 1.0 and
 * are each in [0, 1] when f lies inside the triangle.
 *
 * @param {openfl_geom_Point} p1 - First triangle vertex
 * @param {openfl_geom_Point} p2 - Second triangle vertex
 * @param {openfl_geom_Point} p3 - Third triangle vertex
 * @param {openfl_geom_Point} f  - Test point
 * @returns {openfl_geom_Vector3D} Vector3D(bary1, bary2, bary3)
 */
com_watabou_geom_GeomUtils.barycentric = function(p1,p2,p3,f) {
	// Vectors from f to each vertex
	var f1 = p1.subtract(f);
	var f2 = p2.subtract(f);
	var f3 = p3.subtract(f);
	// Twice the signed area of triangle p1-p2-p3
	var a = (p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x);
	// Sub-areas for each barycentric weight
	var a1 = f2.x * f3.y - f2.y * f3.x;
	var a2 = f3.x * f1.y - f3.y * f1.x;
	var a3 = f1.x * f2.y - f1.y * f2.x;
	return new openfl_geom_Vector3D(a1 / a,a2 / a,a3 / a);
};

/**
 * Determine whether point p lies inside the angular sector defined
 * by the path a->b->c (two consecutive edges sharing vertex b).
 *
 * Returns a signed value: positive if on the "inside" of the
 * sector's sweep, zero if on the boundary, or the raw second
 * sign if outside the first edge.
 *
 * @param {openfl_geom_Point} a - Sector start vertex
 * @param {openfl_geom_Point} b - Sector corner (shared vertex)
 * @param {openfl_geom_Point} c - Sector end vertex
 * @param {openfl_geom_Point} p - Test point
 * @returns {number} Signed containment indicator
 */
com_watabou_geom_GeomUtils.pointInSector = function(a,b,c,p) {
	// Edge vectors
	var v1 = b.subtract(a);
	var v2 = c.subtract(b);
	// Cross product determines sweep direction
	var cross = v1.x * v2.y - v1.y * v2.x;
	// Signed test against edge a->b
	var sign1 = p.x * v1.y - p.y * v1.x - (a.x * b.y - b.x * a.y);
	// If point is on the correct side of edge 1, return that sign
	if(sign1 * cross > 0) {
		return sign1;
	} else {
		// Otherwise return the sign relative to edge b->c
		var sign2 = p.x * v2.y - p.y * v2.x - (b.x * c.y - c.x * b.y);
		return p.x * v2.y - p.y * v2.x - (b.x * c.y - c.x * b.y);
	}
};

// --- Rect (com.watabou.geom.Rect) --- line 4583 ---
/**
 * An axis-aligned rectangle defined by its left edge, top edge,
 * width, and height. Provides computed accessors for right/bottom
 * edges, center coordinates, and intersection queries.
 *
 * The x and y properties are aliases for left and top.
 *
 * @class
 * @param {number} x      - Left edge x coordinate
 * @param {number} y      - Top edge y coordinate
 * @param {number} [width=1]  - Rectangle width (pixels / tiles)
 * @param {number} [height=1] - Rectangle height (pixels / tiles)
 */
var com_watabou_geom_Rect = function(x,y,width,height) {
	if(height == null) {
		height = 1;
	}
	if(width == null) {
		width = 1;
	}
	this.left = x;
	this.top = y;
	this.width = width;
	this.height = height;
};
$hxClasses["com.watabou.geom.Rect"] = com_watabou_geom_Rect;
com_watabou_geom_Rect.__name__ = "com.watabou.geom.Rect";

/**
 * Create an empty rectangle (0, 0, 0, 0).
 *
 * @returns {com_watabou_geom_Rect} A rectangle with zero dimensions
 */
com_watabou_geom_Rect.empty = function() {
	return new com_watabou_geom_Rect(0,0,0,0);
};

com_watabou_geom_Rect.prototype = {
	/** @returns {number} The left edge (x coordinate) */
	get_x: function() {
		return this.left;
	}
	/** @param {number} value - New left edge value */
	,set_x: function(value) {
		return this.left = value;
	}
	/** @returns {number} The top edge (y coordinate) */
	,get_y: function() {
		return this.top;
	}
	/** @param {number} value - New top edge value */
	,set_y: function(value) {
		return this.top = value;
	}

	/**
	 * Compute the right edge: left + width.
	 * @returns {number} Right edge x coordinate
	 */
	,right: function() {
		return this.left + this.width;
	}

	/**
	 * Compute the bottom edge: top + height.
	 * @returns {number} Bottom edge y coordinate
	 */
	,bottom: function() {
		return this.top + this.height;
	}

	/**
	 * Compute the horizontal centre using integer division (>> 1).
	 * @returns {number} Centre x coordinate
	 */
	,centerX: function() {
		return this.left + (this.width >> 1);
	}

	/**
	 * Compute the vertical centre using integer division (>> 1).
	 * @returns {number} Centre y coordinate
	 */
	,centerY: function() {
		return this.top + (this.height >> 1);
	}

	/**
	 * Test whether the rectangle has zero or negative area.
	 * A rectangle is empty if either width <= 0 or height <= 0.
	 *
	 * @returns {boolean} True if the rectangle encloses no area
	 */
	,isEmpty: function() {
		if(this.width > 0) {
			return this.height <= 0;
		} else {
			return true;
		}
	}

	/**
	 * Compute the intersection of this rectangle with another.
	 * Returns a new Rect representing the overlapping region, or
	 * an empty Rect (0,0,0,0) if they do not overlap.
	 *
	 * @param {com_watabou_geom_Rect} toIntersect - The other rectangle
	 * @returns {com_watabou_geom_Rect} The intersection rectangle
	 */
	,intersection: function(toIntersect) {
		// Clamp to the overlapping x-range
		var x0 = this.left < toIntersect.left ? toIntersect.left : this.left;
		var x1 = this.left + this.width > toIntersect.left + toIntersect.width ? toIntersect.left + toIntersect.width : this.left + this.width;
		if(x1 <= x0) {
			return new com_watabou_geom_Rect(0,0,0,0);
		}
		// Clamp to the overlapping y-range
		var y0 = this.top < toIntersect.top ? toIntersect.top : this.top;
		var y1 = this.top + this.height > toIntersect.top + toIntersect.height ? toIntersect.top + toIntersect.height : this.top + this.height;
		if(y1 <= y0) {
			return new com_watabou_geom_Rect(0,0,0,0);
		}
		return new com_watabou_geom_Rect(x0,y0,x1 - x0,y1 - y0);
	}

	/**
	 * Test whether this rectangle overlaps with another rectangle.
	 * More efficient than intersection when only a boolean answer
	 * is needed.
	 *
	 * @param {com_watabou_geom_Rect} toIntersect - The other rectangle
	 * @returns {boolean} True if the rectangles overlap
	 */
	,intersects: function(toIntersect) {
		// Check for non-overlap on x-axis
		var x0 = this.left < toIntersect.left ? toIntersect.left : this.left;
		var x1 = this.left + this.width > toIntersect.left + toIntersect.width ? toIntersect.left + toIntersect.width : this.left + this.width;
		if(x1 <= x0) {
			return false;
		}
		// Check for non-overlap on y-axis
		var y0 = this.top < toIntersect.top ? toIntersect.top : this.top;
		var y1 = this.top + this.height > toIntersect.top + toIntersect.height ? toIntersect.top + toIntersect.height : this.top + this.height;
		return y1 > y0;
	}
	,__class__: com_watabou_geom_Rect
	,__properties__: {set_y:"set_y",get_y:"get_y",set_x:"set_x",get_x:"get_x"}
};

// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_geom_Color = com_watabou_geom_Color;
window.com_watabou_geom_GeomUtils = com_watabou_geom_GeomUtils;
window.com_watabou_geom_Rect = com_watabou_geom_Rect;



// === END modules/watabou/geom.js ===
