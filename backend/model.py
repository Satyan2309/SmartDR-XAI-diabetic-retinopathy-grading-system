# model.py
import torch
import torch.nn as nn
import timm
import os
import urllib.request


class DRGradingModel(nn.Module):
    def __init__(self, num_classes=5):
        super(DRGradingModel, self).__init__()
        self.backbone = timm.create_model(
            'efficientnet_b2',
            pretrained=False,
            num_classes=0,
            global_pool='avg'
        )
        feature_dim = self.backbone.num_features  # 1408

        self.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(feature_dim, 256),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        return self.classifier(self.backbone(x))


def download_model_if_needed(model_path='best_model.pth'):
    """
    Download model from HuggingFace if not present.
    Only runs on Streamlit Cloud — locally you have the file.
    """
    if not os.path.exists(model_path):
        print("Model not found locally. Downloading...")
        # Replace with your actual HuggingFace URL after upload
        hf_url = (
            "https://huggingface.co/"
            "YOURUSERNAME/SmartDR-XAI/"
            "resolve/main/best_model.pth"
        )
        if "YOURUSERNAME" in hf_url:
            raise FileNotFoundError(
                f"Model file '{model_path}' is missing, and the download URL "
                f"is still a placeholder. Put '{model_path}' in the project "
                f"root or update the HuggingFace URL in model.py."
            )
        try:
            urllib.request.urlretrieve(hf_url, model_path)
            print("Model downloaded successfully.")
        except Exception as e:
            print(f"Download failed: {e}")
            raise


def load_model(path="best_model.pth"):
    device = torch.device("cpu")
    
    model = DRGradingModel()
    state = torch.load(path, map_location="cpu")
    model.load_state_dict(state)
    model.eval()
    
    # Reduce memory usage
    torch.set_num_threads(1)
    
    return model, device
 
