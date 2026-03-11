# utils.py
import cv2
import numpy as np
from PIL import Image
import torch
from torchvision import transforms

TARGET_SIZE = 380

GRADE_INFO = {
    0: {
        'name'   : 'No DR',
        'color'  : '#2E7D32',
        'action' : 'No treatment needed. Schedule next screening in 12 months.',
        'urgency': 'LOW'
    },
    1: {
        'name'   : 'Mild DR',
        'color'  : '#1565C0',
        'action' : 'Lifestyle advice. Optimize blood sugar. Follow-up in 12 months.',
        'urgency': 'LOW'
    },
    2: {
        'name'   : 'Moderate DR',
        'color'  : '#FF9800',
        'action' : 'Refer to ophthalmologist within 6 months. Review HbA1c.',
        'urgency': 'MEDIUM'
    },
    3: {
        'name'   : 'Severe DR',
        'color'  : '#E65100',
        'action' : 'Urgent ophthalmology referral within 1 month. Risk of vision loss.',
        'urgency': 'HIGH'
    },
    4: {
        'name'   : 'Proliferative DR',
        'color'  : '#B71C1C',
        'action' : 'EMERGENCY referral today. Immediate risk of permanent blindness.',
        'urgency': 'CRITICAL'
    },
}

val_transform = transforms.Compose([
    transforms.Resize((TARGET_SIZE, TARGET_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


def check_quality(image_array, blur_threshold=80):
    """
    Check if fundus image meets quality standards.
    Returns (is_ok, message)
    """
    gray            = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    blur_score      = cv2.Laplacian(gray, cv2.CV_64F).var()
    mean_brightness = gray.mean()

    if blur_score < blur_threshold:
        return False, (
            f"Image too blurry (score: {blur_score:.1f}). "
            f"Please retake the image."
        )
    if mean_brightness < 20:
        return False, "Image too dark. Please improve lighting."
    if mean_brightness > 235:
        return False, "Image overexposed. Please reduce brightness."

    return True, f"Quality acceptable (sharpness score: {blur_score:.1f})"


def apply_clahe(image_array):
    """
    Apply CLAHE contrast enhancement.
    Improves microaneurysm visibility.
    """
    img = cv2.resize(
        image_array, (TARGET_SIZE, TARGET_SIZE)
    )
    lab        = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l, a, b    = cv2.split(lab)
    clahe      = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l)
    enhanced   = cv2.cvtColor(
        cv2.merge([l_enhanced, a, b]), cv2.COLOR_LAB2RGB
    )
    return enhanced


def preprocess(image_array):
    """
    Full preprocessing pipeline.
    Returns (tensor, enhanced_array)
    """
    enhanced  = apply_clahe(image_array)
    pil_image = Image.fromarray(enhanced)
    tensor    = val_transform(pil_image)
    return tensor, enhanced


def predict(model, image_tensor, device):
    """
    Run model inference.
    Returns (grade, confidence, all_probs_array)
    """
    with torch.no_grad():
        output     = model(image_tensor.unsqueeze(0).to(device))
        probs      = torch.softmax(output, dim=1)[0]
        pred_class = torch.argmax(probs).item()
        confidence = probs[pred_class].item()
    return pred_class, confidence, probs.numpy()