#!/usr/bin/env python3
"""Détoure le sujet d'une photo (rembg / IS-Net) → PNG RGBA.

    python3 scripts/covers/cutout.py entree.jpg sortie.png

Utilisé par make.mjs pour garder l'artiste en couleurs naturelles pendant que le décor
derrière lui passe en bichromie DailyRap. Le modèle (180 Mo) se télécharge au premier appel.
"""
import sys
from PIL import Image, ImageFilter
from rembg import remove, new_session

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
cut = remove(im, session=new_session("isnet-general-use"), post_process_mask=True)
# Bord légèrement adouci : évite le liseré dur entre le sujet couleur et le fond rouge.
a = cut.getchannel("A").filter(ImageFilter.GaussianBlur(1.2))
cut.putalpha(a)
cut.save(dst, optimize=True)
print(dst)
