# C:\WingManBackend\tts_piper\__init__.py

"""
WingMan Piper TTS subsystem.

Provides a clean interface for generating speech audio from text using Piper.
WingMan should only interact with the `service` module.
"""

from .service import generate_audio
