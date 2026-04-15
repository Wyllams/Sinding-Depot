import os
import speech_recognition as sr
from pydub import AudioSegment
import imageio_ffmpeg

AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()

def transcribe(file_name):
    for f in os.listdir('.'):
        if file_name in f and f.endswith('.ogg'):
            file_name = f
            break
            
    try:
        audio = AudioSegment.from_ogg(file_name)
        wav_path = file_name + ".wav"
        audio.export(wav_path, format="wav")
        
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language="pt-BR")
            print(f"\n--- {file_name} ---")
            print(text)
    except Exception as e:
        print(f"\nError transcribing {file_name}: {e}")

transcribe('11.52.51.ogg')
transcribe('11.53.49.ogg')
