from PIL import Image
import sys

def remove_background(input_path, output_path, tolerance=50):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()

    # Get the background color from the top-left pixel
    bg_color = data[0]

    new_data = []
    for item in data:
        # Check if the pixel matches the background color within tolerance
        if (abs(item[0] - bg_color[0]) < tolerance and
            abs(item[1] - bg_color[1]) < tolerance and
            abs(item[2] - bg_color[2]) < tolerance):
            # Make it transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

input_img = r"C:\Users\wylla\.gemini\antigravity\brain\4a78eaf0-0fa8-43a8-839d-6177bcb9239d\media__1776044207500.png"
output_img = r"c:\Users\wylla\.gemini\Siding Depot - Flutter\web\public\logo-new.png"

remove_background(input_img, output_img, tolerance=60)
