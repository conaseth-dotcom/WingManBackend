import torch

PATH = "models/model.pth"   # adjust if needed

obj = torch.load(PATH, map_location="cpu", weights_only=False)

print("TYPE:", type(obj))
print("DIR:", dir(obj))
