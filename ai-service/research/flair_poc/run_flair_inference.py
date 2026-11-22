"""
VisionBridge Milestone 5.2A: Real FLAIR Inference Benchmark
Evaluates authentic pretrained FLAIR checkpoint (jusiro2/FLAIR) on real retinal fundus photographs.
Hardware: CPU execution.
Non-diagnostic disclaimer: Experimental research similarity scores; not a medical diagnosis.
"""

import os
import sys

# Force offline mode for Hugging Face Hub and Transformers to use cached weights directly
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import time
import json
from pathlib import Path
import numpy as np
import torch
from PIL import Image

# Add FLAIR to python path if needed
flair_root = Path(__file__).parent / "FLAIR"
if str(flair_root) not in sys.path:
    sys.path.insert(0, str(flair_root))

from flair import FLAIRModel

DISCLAIMER = (
    "EXPERIMENTAL RETINAL IMAGE-TEXT SIMILARITY RESULTS — REQUIRES PROFESSIONAL REVIEW. "
    "DO NOT USE FOR DIRECT CLINICAL DIAGNOSIS OR SPECTACLE POWER DETERMINATION."
)

def run_flair_benchmark():
    print("=" * 80)
    print("VISIONBRIDGE MILESTONE 5.2A — FLAIR REAL INFERENCE BENCHMARK")
    print("=" * 80)
    print(f"Non-Diagnostic Disclaimer: {DISCLAIMER}\n")

    # 1. Device check
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Execution Device: {device.upper()}")
    if device == "cpu":
        print(f"PyTorch Threads: {torch.get_num_threads()}")

    # 2. Load model
    print("\nLoading pretrained FLAIR checkpoint from Hugging Face ('jusiro2/FLAIR')...")
    load_start = time.perf_counter()
    model = FLAIRModel.from_pretrained("jusiro2/FLAIR")
    model.eval()
    load_duration = (time.perf_counter() - load_start) * 1000
    print(f"Model loaded successfully in {load_duration:.2f} ms")

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    vision_params = sum(p.numel() for p in model.vision_model.parameters())
    text_params = sum(p.numel() for p in model.text_model.parameters())
    logit_scale_val = model.logit_scale.item()
    exp_logit_scale = float(torch.exp(model.logit_scale).item())

    print(f"Total Parameters: {total_params:,}")
    print(f"  - Vision Backbone (ResNet-50 + Proj): {vision_params:,}")
    print(f"  - Text Backbone (Bio_ClinicalBERT + Proj): {text_params:,}")
    print(f"Learned logit_scale parameter: {logit_scale_val:.4f} (Multiplicative factor: {exp_logit_scale:.3f})")

    # 3. Define test images
    base_dir = Path(__file__).parent
    workspace_root = base_dir.parent.parent

    test_images = {
        "normal_sample": {
            "path": flair_root / "documents" / "normal_sample.png",
            "type": "retinal_fundus",
            "ground_truth_label": "Normal Retinal Fundus",
            "notes": "Official FLAIR authentic sample from GitHub documents repository."
        },
        "sample_macular_hole": {
            "path": flair_root / "documents" / "sample_macular_hole.png",
            "type": "retinal_fundus",
            "ground_truth_label": "Macular Hole",
            "notes": "Official FLAIR authentic sample with full-thickness foveal defect."
        },
        "severe_nonprol_dr": {
            "path": flair_root / "documents" / "severe_nonprol_dr.jpg",
            "type": "retinal_fundus",
            "ground_truth_label": "Severe Non-Proliferative Diabetic Retinopathy",
            "notes": "Official FLAIR authentic sample exhibiting microaneurysms and hemorrhages."
        },
        "negative_control_anterior": {
            "path": workspace_root / "ai-service" / "test_data" / "images" / "SUBJ_001_sess1_phone1_straight_01.png",
            "type": "anterior_external_eye",
            "ground_truth_label": "External Smartphone Anterior Eye (Non-Fundus Control)",
            "notes": "Negative control: smartphone anterior photograph to test domain boundary."
        }
    }

    # 4. Define Prompt Sets
    prompt_sets = {
        "standard_clinical": [
            "normal retinal fundus",
            "diabetic retinopathy",
            "glaucoma",
            "macular edema",
            "macular hole",
            "suboptimal or non-fundus image"
        ],
        "flair_canonical": [
            "normal",
            "diabetic retinopathy",
            "glaucoma",
            "macular hole",
            "age-related macular degeneration"
        ],
        "detailed_morphological": [
            "healthy normal retina with sharp optic disc margins and intact fovea",
            "severe diabetic retinopathy with extensive microaneurysms and retinal hemorrhages",
            "glaucoma with optic nerve cup enlargement and neuroretinal rim thinning",
            "full-thickness macular hole with round central foveal defect",
            "external smartphone photograph of anterior eye, cornea, and eyelid"
        ]
    }

    # Output directory
    output_dir = base_dir / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    all_results = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "model": "jusiro2/FLAIR",
            "repository": "https://github.com/jusiro/FLAIR",
            "paper": "https://arxiv.org/abs/2308.07898",
            "device": device,
            "torch_version": torch.__version__,
            "total_parameters": total_params,
            "vision_parameters": vision_params,
            "text_parameters": text_params,
            "learned_logit_scale": logit_scale_val,
            "effective_scale_multiplier": exp_logit_scale,
            "disclaimer": DISCLAIMER
        },
        "benchmarks": {}
    }

    # 5. Run inference loops
    print("\n" + "=" * 80)
    print("RUNNING INFERENCE ON AUTHENTIC TEST SAMPLES")
    print("=" * 80)

    for img_key, img_meta in test_images.items():
        img_path = img_meta["path"]
        if not img_path.exists():
            print(f"[ERROR] Image not found: {img_path}")
            continue

        raw_img = Image.open(img_path).convert("RGB")
        orig_w, orig_h = raw_img.size
        img_np = np.array(raw_img)

        print(f"\nEvaluating Image: {img_key}")
        print(f"  - Source: {img_path.name} ({orig_w}x{orig_h} RGB)")
        print(f"  - Clinical Ground Truth: {img_meta['ground_truth_label']}")
        print(f"  - Image Domain: {img_meta['type']}")

        image_benchmark = {
            "file_name": img_path.name,
            "ground_truth": img_meta["ground_truth_label"],
            "image_type": img_meta["type"],
            "original_dimensions": [orig_w, orig_h],
            "prompt_set_evaluations": {}
        }

        # Preprocess image once to examine embeddings
        tensor_img = model.preprocess_image(img_np)
        with torch.no_grad():
            img_embed = model.vision_model(tensor_img)
            img_norm = float(torch.norm(img_embed).item())

        for p_set_name, prompts in prompt_sets.items():
            # Warmup run
            with torch.no_grad():
                _ = model(img_np, prompts)

            # Timed runs (3 repetitions to get average CPU latency)
            latencies = []
            for _ in range(3):
                t0 = time.perf_counter()
                with torch.no_grad():
                    # Forward step
                    probs, logits = model(img_np, prompts)
                latencies.append((time.perf_counter() - t0) * 1000)

            avg_latency_ms = float(np.mean(latencies))
            probs_flat = probs[0].tolist()
            logits_flat = logits[0].tolist()

            # Raw cosine similarities (logits divided by exp(logit_scale))
            raw_cosine_sims = [float(l / exp_logit_scale) for l in logits_flat]

            # Rank categories by probability / logit
            ranked_indices = np.argsort(logits_flat)[::-1]
            rankings = []
            for rank, idx in enumerate(ranked_indices, start=1):
                rankings.append({
                    "rank": rank,
                    "prompt": prompts[idx],
                    "pseudo_probability": float(probs_flat[idx]),
                    "raw_logit": float(logits_flat[idx]),
                    "cosine_similarity": float(raw_cosine_sims[idx])
                })

            top_pred = rankings[0]
            print(f"  [{p_set_name}] Latency: {avg_latency_ms:.1f} ms | Top: '{top_pred['prompt']}' ({top_pred['pseudo_probability'] * 100:.2f}%, logit: {top_pred['raw_logit']:.3f}, cos: {top_pred['cosine_similarity']:.4f})")

            image_benchmark["prompt_set_evaluations"][p_set_name] = {
                "latency_ms": round(avg_latency_ms, 2),
                "top_prediction": top_pred["prompt"],
                "top_probability": round(top_pred["pseudo_probability"], 4),
                "rankings": rankings
            }

        all_results["benchmarks"][img_key] = image_benchmark

    # Save benchmark results
    out_file = output_dir / "flair_inference_benchmark.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)
    print(f"\n[OK] Benchmark results saved to: {out_file}")

    # Print summary comparative table
    print("\n" + "=" * 80)
    print("BENCHMARK SUMMARY TABLE: STANDARD CLINICAL PROMPT SET")
    print("=" * 80)
    print(f"{'Image Key':<26} | {'Ground Truth':<30} | {'Top-1 Predicted Prompt':<30} | {'Prob (%)':<8} | {'Latency':<8}")
    print("-" * 110)
    for img_key, data in all_results["benchmarks"].items():
        std_eval = data["prompt_set_evaluations"]["standard_clinical"]
        top_p = std_eval["top_prediction"]
        top_prob = std_eval["top_probability"] * 100
        lat = std_eval["latency_ms"]
        gt = data["ground_truth"][:28]
        print(f"{img_key:<26} | {gt:<30} | {top_p:<30} | {top_prob:<7.2f}% | {lat:<6.1f} ms")

    print("\n" + "=" * 80)
    print("DETAILED RANKINGS PER SAMPLE (STANDARD CLINICAL SET)")
    print("=" * 80)
    for img_key, data in all_results["benchmarks"].items():
        print(f"\nImage: {img_key} (GT: {data['ground_truth']})")
        print(f"  {'Rank':<5} | {'Candidate Prompt':<35} | {'Cosine Sim':<12} | {'Logit':<8} | {'Pseudo-Prob (%)':<15}")
        print("  " + "-" * 82)
        rankings = data["prompt_set_evaluations"]["standard_clinical"]["rankings"]
        for r in rankings:
            print(f"  #{r['rank']:<4} | {r['prompt']:<35} | {r['cosine_similarity']:<12.4f} | {r['raw_logit']:<8.2f} | {r['pseudo_probability'] * 100:>6.2f}%")

    print("\n[OK] FLAIR Inference Benchmark complete.")

if __name__ == "__main__":
    run_flair_benchmark()
