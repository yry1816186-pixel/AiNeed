from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from typing import Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from PIL import Image

from services.color_season_analyzer import (
    ColorSeason,
    ColorSeasonResult,
    ColorSwatch,
    DepthType,
    ToneType,
    _combine_season,
    _compute_region_hsl,
    _determine_depth,
    _determine_tone,
    _is_skin_pixel,
    _rgb_to_hsl,
    analyze_color_season,
    generate_palette,
)


class TestRgbToHsl(unittest.TestCase):
    def test_red(self):
        h, s, l = _rgb_to_hsl(255, 0, 0)
        self.assertAlmostEqual(h, 0.0, places=0)
        self.assertAlmostEqual(s, 100.0, places=0)
        self.assertAlmostEqual(l, 50.0, places=0)

    def test_green(self):
        h, s, l = _rgb_to_hsl(0, 255, 0)
        self.assertAlmostEqual(h, 120.0, places=0)
        self.assertAlmostEqual(s, 100.0, places=0)
        self.assertAlmostEqual(l, 50.0, places=0)

    def test_blue(self):
        h, s, l = _rgb_to_hsl(0, 0, 255)
        self.assertAlmostEqual(h, 240.0, places=0)
        self.assertAlmostEqual(s, 100.0, places=0)
        self.assertAlmostEqual(l, 50.0, places=0)

    def test_white(self):
        h, s, l = _rgb_to_hsl(255, 255, 255)
        self.assertAlmostEqual(s, 0.0, places=0)
        self.assertAlmostEqual(l, 100.0, places=0)

    def test_black(self):
        h, s, l = _rgb_to_hsl(0, 0, 0)
        self.assertAlmostEqual(s, 0.0, places=0)
        self.assertAlmostEqual(l, 0.0, places=0)

    def test_warm_skin_tone(self):
        h, s, l = _rgb_to_hsl(220, 180, 150)
        self.assertLess(h, 45.0)
        self.assertGreater(l, 50.0)

    def test_cool_skin_tone(self):
        h, s, l = _rgb_to_hsl(180, 170, 200)
        self.assertGreater(h, 180.0)


class TestIsSkinPixel(unittest.TestCase):
    def test_typical_warm_skin(self):
        self.assertTrue(_is_skin_pixel(220, 180, 150))

    def test_typical_cool_skin(self):
        self.assertTrue(_is_skin_pixel(200, 175, 190))

    def test_dark_skin(self):
        self.assertTrue(_is_skin_pixel(140, 100, 70))

    def test_pure_red_not_skin(self):
        self.assertFalse(_is_skin_pixel(255, 0, 0))

    def test_pure_green_not_skin(self):
        self.assertFalse(_is_skin_pixel(0, 255, 0))

    def test_pure_blue_not_skin(self):
        self.assertFalse(_is_skin_pixel(0, 0, 255))

    def test_black_not_skin(self):
        self.assertFalse(_is_skin_pixel(0, 0, 0))

    def test_very_dark_not_skin(self):
        self.assertFalse(_is_skin_pixel(30, 20, 10))

    def test_light_skin(self):
        self.assertTrue(_is_skin_pixel(240, 210, 195))


class TestDetermineTone(unittest.TestCase):
    def test_warm_hue(self):
        tone, conf = _determine_tone(20.0)
        self.assertEqual(tone, ToneType.WARM)
        self.assertGreater(conf, 0.5)

    def test_cool_hue(self):
        tone, conf = _determine_tone(200.0)
        self.assertEqual(tone, ToneType.COOL)
        self.assertGreater(conf, 0.5)

    def test_boundary_warm(self):
        tone, _ = _determine_tone(45.0)
        self.assertEqual(tone, ToneType.WARM)

    def test_boundary_cool(self):
        tone, _ = _determine_tone(180.0)
        self.assertEqual(tone, ToneType.COOL)

    def test_near_zero_warm(self):
        tone, _ = _determine_tone(5.0)
        self.assertEqual(tone, ToneType.WARM)

    def test_near_360_warm(self):
        tone, _ = _determine_tone(340.0)
        self.assertEqual(tone, ToneType.WARM)


class TestDetermineDepth(unittest.TestCase):
    def test_light(self):
        depth, conf = _determine_depth(65.0)
        self.assertEqual(depth, DepthType.LIGHT)
        self.assertGreater(conf, 0.5)

    def test_deep(self):
        depth, conf = _determine_depth(30.0)
        self.assertEqual(depth, DepthType.DEEP)
        self.assertGreater(conf, 0.5)

    def test_boundary_light(self):
        depth, _ = _determine_depth(55.0)
        self.assertEqual(depth, DepthType.LIGHT)

    def test_boundary_deep(self):
        depth, _ = _determine_depth(35.0)
        self.assertEqual(depth, DepthType.DEEP)


class TestCombineSeason(unittest.TestCase):
    def test_spring(self):
        self.assertEqual(_combine_season(ToneType.WARM, DepthType.LIGHT), ColorSeason.SPRING)

    def test_summer(self):
        self.assertEqual(_combine_season(ToneType.COOL, DepthType.LIGHT), ColorSeason.SUMMER)

    def test_autumn(self):
        self.assertEqual(_combine_season(ToneType.WARM, DepthType.DEEP), ColorSeason.AUTUMN)

    def test_winter(self):
        self.assertEqual(_combine_season(ToneType.COOL, DepthType.DEEP), ColorSeason.WINTER)


class TestGeneratePalette(unittest.TestCase):
    def test_spring_palette_count(self):
        palette = generate_palette(ColorSeason.SPRING)
        self.assertEqual(len(palette["suitable"]), 8)
        self.assertEqual(len(palette["unsuitable"]), 4)

    def test_summer_palette_count(self):
        palette = generate_palette(ColorSeason.SUMMER)
        self.assertEqual(len(palette["suitable"]), 8)
        self.assertEqual(len(palette["unsuitable"]), 4)

    def test_autumn_palette_count(self):
        palette = generate_palette(ColorSeason.AUTUMN)
        self.assertEqual(len(palette["suitable"]), 8)
        self.assertEqual(len(palette["unsuitable"]), 4)

    def test_winter_palette_count(self):
        palette = generate_palette(ColorSeason.WINTER)
        self.assertEqual(len(palette["suitable"]), 8)
        self.assertEqual(len(palette["unsuitable"]), 4)

    def test_swatch_has_required_fields(self):
        palette = generate_palette(ColorSeason.SPRING)
        for swatch in palette["suitable"]:
            self.assertIsInstance(swatch, ColorSwatch)
            self.assertTrue(swatch.name)
            self.assertTrue(swatch.hex_value.startswith("#"))
            self.assertTrue(swatch.reason)

    def test_palette_to_dict(self):
        palette = generate_palette(ColorSeason.SPRING)
        for swatch in palette["suitable"]:
            d = swatch.to_dict()
            self.assertIn("name", d)
            self.assertIn("hex_value", d)
            self.assertIn("reason", d)

    def test_hex_format(self):
        for season in ColorSeason:
            palette = generate_palette(season)
            for swatch in palette["suitable"]:
                self.assertRegex(swatch.hex_value, r"^#[0-9A-Fa-f]{6}$")
            for swatch in palette["unsuitable"]:
                self.assertRegex(swatch.hex_value, r"^#[0-9A-Fa-f]{6}$")


def _make_face_image(hue: float, saturation: float, lightness: float, size: int = 200) -> Image.Image:
    h_n = hue / 360.0
    s_n = saturation / 100.0
    l_n = lightness / 100.0

    c = (1.0 - abs(2.0 * l_n - 1.0)) * s_n
    x = c * (1.0 - abs((h_n * 6.0) % 2.0 - 1.0))
    m = l_n - c / 2.0

    if h_n < 1 / 6:
        r, g, b = c, x, 0
    elif h_n < 2 / 6:
        r, g, b = x, c, 0
    elif h_n < 3 / 6:
        r, g, b = 0, c, x
    elif h_n < 4 / 6:
        r, g, b = 0, x, c
    elif h_n < 5 / 6:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x

    r_int = int((r + m) * 255)
    g_int = int((g + m) * 255)
    b_int = int((b + m) * 255)

    arr = np.full((size, size, 3), [r_int, g_int, b_int], dtype=np.uint8)
    return Image.fromarray(arr)


def _make_face_image_rgb(r: int, g: int, b: int, size: int = 200) -> Image.Image:
    arr = np.full((size, size, 3), [r, g, b], dtype=np.uint8)
    return Image.fromarray(arr)


class TestAnalyzeColorSeason(unittest.TestCase):
    def test_warm_light_returns_spring(self):
        img = _make_face_image(hue=25.0, saturation=50.0, lightness=70.0)
        result = analyze_color_season(img)
        self.assertEqual(result.season, ColorSeason.SPRING)
        self.assertEqual(result.tone, ToneType.WARM)
        self.assertEqual(result.depth, DepthType.LIGHT)

    def test_cool_light_returns_summer(self):
        img = _make_face_image_rgb(200, 180, 195)
        result = analyze_color_season(img)
        self.assertEqual(result.season, ColorSeason.SUMMER)
        self.assertEqual(result.tone, ToneType.COOL)
        self.assertEqual(result.depth, DepthType.LIGHT)

    def test_warm_deep_returns_autumn(self):
        img = _make_face_image(hue=25.0, saturation=50.0, lightness=40.0)
        result = analyze_color_season(img)
        self.assertEqual(result.season, ColorSeason.AUTUMN)
        self.assertEqual(result.tone, ToneType.WARM)
        self.assertEqual(result.depth, DepthType.DEEP)

    def test_cool_deep_returns_winter(self):
        img = _make_face_image_rgb(120, 100, 115)
        result = analyze_color_season(img)
        self.assertEqual(result.season, ColorSeason.WINTER)
        self.assertEqual(result.tone, ToneType.COOL)
        self.assertEqual(result.depth, DepthType.DEEP)

    def test_result_has_palette(self):
        img = _make_face_image(hue=25.0, saturation=50.0, lightness=70.0)
        result = analyze_color_season(img)
        self.assertEqual(len(result.suitable_colors), 8)
        self.assertEqual(len(result.unsuitable_colors), 4)

    def test_result_confidence_range(self):
        img = _make_face_image(hue=25.0, saturation=50.0, lightness=70.0)
        result = analyze_color_season(img)
        self.assertGreater(result.confidence, 0.0)
        self.assertLessEqual(result.confidence, 1.0)

    def test_result_to_dict_json_serializable(self):
        img = _make_face_image(hue=25.0, saturation=50.0, lightness=70.0)
        result = analyze_color_season(img)
        d = result.to_dict()
        json_str = json.dumps(d, ensure_ascii=False)
        parsed = json.loads(json_str)
        self.assertEqual(parsed["season"], result.season.value)
        self.assertIn("skin_hsl", parsed)
        self.assertIn("suitable_colors", parsed)
        self.assertIn("unsuitable_colors", parsed)

    def test_invalid_input_raises(self):
        with self.assertRaises(TypeError):
            analyze_color_season(12345)


class TestComputeRegionHsl(unittest.TestCase):
    def test_uniform_region(self):
        arr = np.full((100, 100, 3), [220, 180, 150], dtype=np.uint8)
        result = _compute_region_hsl(arr, (0.0, 0.0, 1.0, 1.0))
        self.assertIsNotNone(result)
        h, s, l = result
        self.assertLess(h, 45.0)

    def test_empty_region(self):
        arr = np.full((100, 100, 3), [0, 255, 0], dtype=np.uint8)
        result = _compute_region_hsl(arr, (0.0, 0.0, 1.0, 1.0))
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
