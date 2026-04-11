"""测试嵌入生成"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.build_fashion_embeddings import *

def test():
    items = load_processed_items()
    print(f'商品数: {len(items)}')
    
    model, processor, device = get_fashion_clip_model()
    print(f'设备: {device}')
    
    first_item = list(items.values())[0]
    image_path = first_item.get('image_path', '')
    print(f'测试图片: {image_path}')
    
    if image_path and Path(image_path).exists():
        emb = generate_image_embedding(image_path, model, processor, device)
        if emb is not None:
            print(f'嵌入维度: {emb.shape}')
            print('测试成功!')
        else:
            print('嵌入生成失败!')
    else:
        print('图片不存在!')

if __name__ == '__main__':
    test()
