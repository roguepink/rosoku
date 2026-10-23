# Higgsfield で作る 20灯の静止画の指示文(2026-10-23)。順番はアプリの並び(js/candles.js)と同じ。
BASE = ("Photorealistic night photograph, vertical 9:16, static locked-off camera at eye level slightly above the table, centered composition. {s} "
        "It stands exactly in the horizontal center of the frame on a black urushi lacquer table; the table's back edge meets a flat rough earthen clay wall "
        "(jurakukabe with faint straw fibers) about one third up from the bottom of the frame. The wall is flat and straight behind, no room corner. "
        "The only light is the warm amber candlelight (about 1850K), pooling softly on the wall and fading to deep darkness toward the edges and the top. "
        "A soft, blurred, faint reflection in the glossy black lacquer. Very dark, quiet, Tanizaki 'In Praise of Shadows' mood. "
        "Generous dark space above the flame. No people, no text, no other objects.")
WA = "The flame is large, calm, tall and orange with a soft rounded tip, the thick dark hollow wick visible inside it, a tiny blue base."
SUBJECTS = [
  ("wa-shiro", "A single traditional Japanese candle (warosoku, ikari shape: slightly wider at the top, ivory-white haze wax, matte), about 15 cm tall, on a simple black iron candlestick (shokudai) with a spike and a small round drip pan. " + WA),
  ("shu", "A vermilion-red traditional Japanese candle (shu-rousoku, ikari shape, wider at the top, deep vermilion wax with a slight sheen), about 18 cm tall, on a vermilion-lacquered candlestick with a thin gold line on its drip pan. " + WA),
  ("botan", "An Aizu painted Japanese candle (e-rousoku, ikari shape, ivory-white wax), about 20 cm tall, hand-painted with two large crimson-and-pink peony flowers and dark green leaves, on a black-lacquered candlestick with a thin gold line. " + WA),
  ("andon", "A traditional Japanese square paper lantern (kaku-andon): a frame of black-lacquered wood with off-white washi paper panels, about 40 cm tall, on short legs, a candle burning inside. The washi glows softly and evenly in warm amber, brighter in the middle where the hidden flame is, with faint paper fibers and the shadow lines of the frame."),
  ("take", "A bamboo lantern (take-akari): a tall section of aged bamboo, about 11 cm wide and 40 cm tall, with many small round holes drilled in flowing diagonal patterns, a candle burning inside. Warm golden light shines out through every hole and from the open top, and the holes are projected as soft scattered dots of light on the wall behind."),
  ("kin", "A gold-leaf Japanese candle (kin-rousoku, ikari shape), about 16 cm tall, completely covered in gold leaf with faint square seams of the leaf, softly gleaming, on a vermilion-lacquered candlestick. " + WA),
  ("wa-e", "A vermilion-red painted Japanese candle (e-rousoku, ikari shape), about 15 cm tall, hand-painted with two white camellia flowers with yellow centers and dark green leaves, on a simple black iron candlestick. " + WA),
  ("bonbori", "A traditional Japanese bonbori lamp: a hexagonal washi paper shade, slightly wider at the top, on a slender vermilion-lacquered pole with a round base, about 45 cm tall, a candle burning inside. The paper glows softly in warm amber; the flame is seen only as a brighter blurred spot through the paper."),
  ("kinari", "A natural unbleached haze-wax Japanese candle (kinari, straight bar shape, deep warm yellow wax, slightly translucent), about 14 cm tall, on a small grey-glazed ceramic candle stand. " + WA),
  ("toumyou", "A traditional Japanese oil lamp (toumyou-zara): a small unglazed reddish clay dish (kawarake) filled with dark amber rapeseed oil, a white rush-pith wick lying in the oil and resting over the rim, a small flame burning at the edge of the dish; the dish rests on top of a tall slender dark wooden lamp stand (toudai). The flame is small and orange with a darker sooty tip."),
  ("ume", "A slim Japanese painted candle (straight bar shape, ivory-white wax), about 15 cm tall, hand-painted with small red plum blossoms (ume) along a thin dark brown branch winding up it, on a simple black iron candlestick. " + WA),
  ("kiku", "A Japanese painted candle (ikari shape, ivory-white wax), about 17 cm tall, hand-painted with one large golden-yellow chrysanthemum with fine petals and two small white chrysanthemums with green leaves, on a black-lacquered candlestick. " + WA),
  ("teshoku", "A Japanese brass hand candlestick (teshoku) with a round brass dish and a short handle, holding a white candle inside a tall clear glass chimney (hoya) that bulges gently in the middle; the calm slender flame is seen through the glass, with soft reflections and vertical highlights on the glass."),
  ("hyakume", "A very large traditional Japanese temple candle (hyakume warosoku, ikari shape, ivory-white wax), about 25 cm tall and 7 cm wide, on a large brass candlestick. A big, tall, orange flame with a thick curled charred wick."),
  ("ayame", "A slim Japanese painted candle (straight bar shape, ivory-white wax), about 15 cm tall, hand-painted with three purple iris flowers with yellow streaks and tall sword-shaped green leaves, on a brass candlestick. " + WA),
  ("mame", "A tiny thin white Japanese candle (mame-rousoku), about 8 cm tall, standing on a small unglazed clay saucer (kawarake) with a pin. A small calm orange flame."),
  ("mitsurou", "A golden honey-colored beeswax pillar candle with a faint honeycomb texture, about 9 cm tall and 5 cm wide, on a small dark wooden dish. The melted pool glows amber. A calm golden flame."),
  ("tea", "A small tealight candle in a ribbed aluminum cup, sitting on a small grey-glazed ceramic dish (mamezara). A small calm flame; the clear melted wax pool glows."),
  ("hashira", "A thick white pillar candle, about 7.5 cm wide and 11 cm tall, burned down in the middle so its wax walls glow warmly from inside like a lantern; the calm flame sits low inside the hollow."),
  ("hosoi", "A slim ivory taper candle about 20 cm tall in a simple brass candlestick. A calm slender flame."),
]
def prompts():
    return [(cid, BASE.format(s=s)) for cid, s in SUBJECTS]
if __name__ == "__main__":
    import json; print(json.dumps([{"index": i, "params": {"model": "gpt_image_2_5", "aspect_ratio": "9:16", "prompt": p}} for i, (c, p) in enumerate(prompts())], ensure_ascii=False))
