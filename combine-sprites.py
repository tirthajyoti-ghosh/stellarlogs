from PIL import Image
import glob
import os

def combine_vertically(image_paths, output_path):
    images = []
    for path in image_paths:
        try:
            img = Image.open(path)
            images.append(img)
        except FileNotFoundError:
            print(f"Error: Image not found at {path}")
            return

    if not images:
        print("Error: No images were loaded.")
        return

    # Calculate dimensions of the new image
    widths, heights = zip(*[img.size for img in images])
    total_height = sum(heights)
    max_width = max(widths)

    new_image = Image.new('RGBA', (max_width, total_height)) # or 'RGB', or other modes

    y_offset = 0
    for img in images:
        new_image.paste(img, (0, y_offset))  # Pasts the image onto the new image
        y_offset += img.size[1]

    new_image.save(output_path)
    print(f"Sprite sheet saved to {output_path}")

input_folder = r"./stars"

if not os.path.isdir(input_folder):
    print(f"Error: Input folder not found at '{input_folder}'")
    print("Please create the folder and add your images, or correct the path.")
else:
    image_extensions = ["*.png"]
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(input_folder, ext)))

    # Sort files to ensure a consistent order (optional, but good practice)
    image_files.sort()

    if not image_files:
        print(f"No image files found in folder: {input_folder}")
    else:
        print(f"Found images: {image_files}")
        # 3. Determine the output file name based on the folder name
        #    The output will be saved inside the input folder.
        folder_name = os.path.basename(os.path.normpath(input_folder))
        output_file = f"{folder_name}.png"

        combine_vertically(image_files, output_file)