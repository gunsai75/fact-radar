import os
import json
import torch
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import BertTokenizer, BertForSequenceClassification

# Configure these paths based on your setup
MODEL_PATH = "bert_liar_model.pt"

class NewsFact:
    def __init__(self, model_path):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Loading model from {model_path} on {self.device}")
        
        # Load model with weights_only=False (for older model formats)
        try:
            # First try to load with the new secure method
            checkpoint = torch.load(model_path, map_location=self.device)
        except Exception as e:
            print(f"Secure loading failed: {str(e)}")
            print("Attempting to load with weights_only=False...")
            # Fall back to the less secure but compatible method
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
            print("Model loaded with weights_only=False")
        
        config = checkpoint['config']
        
        # Initialize tokenizer from pretrained model instead of from checkpoint
        self.tokenizer = BertTokenizer.from_pretrained(config['model_name'])
        
        # Initialize model
        self.model = BertForSequenceClassification.from_pretrained(
            config['model_name'],
            num_labels=config['num_labels']
        )
        
        # Load state dict
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        print("Model loaded successfully")
    
    def preprocess(self, text):
        # Truncate to BERT's maximum length
        max_length = 512
        
        # Tokenize
        encoded_dict = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoded_dict['input_ids'].to(self.device),
            'attention_mask': encoded_dict['attention_mask'].to(self.device)
        }
    
    def analyze(self, text):
        # Preprocess the input text
        inputs = self.preprocess(text)
        
        # Make prediction
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            
            # Get probabilities
            probs = torch.nn.functional.softmax(logits, dim=1)
            prediction = torch.argmax(probs, dim=1).item()
            confidence = probs[0][prediction].item()
        
        # Results: 0 = Real, 1 = Fake
        result = {
            'prediction': prediction,
            'prediction_label': 'Real' if prediction == 0 else 'Fake',
            'confidence': confidence,
            'confidence_percentage': f"{confidence * 100:.2f}%"
        }
        
        return result

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# Initialize model as None at first
news_fact_checker = None

# Create a function to initialize the model
def init_model():
    global news_fact_checker
    if news_fact_checker is None:
        try:
            news_fact_checker = NewsFact(MODEL_PATH)
        except Exception as e:
            print(f"Error initializing model: {str(e)}")
            raise
    return news_fact_checker

@app.route('/analyze', methods=['POST'])
def analyze():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    
    data = request.get_json()
    
    if 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data['text']
    source_url = data.get('source_url', 'Unknown')
    
    # Ensure model is loaded
    try:
        checker = init_model()
    except Exception as e:
        return jsonify({"error": f"Failed to load model: {str(e)}"}), 500
    
    # Analyze the text
    try:
        result = checker.analyze(text)
        
        # Add meta info
        result['text_preview'] = text[:200] + '...' if len(text) > 200 else text
        result['source_url'] = source_url
        result['characters_analyzed'] = len(text)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    # Check if model can be loaded
    try:
        _ = init_model()
        model_loaded = True
    except Exception as e:
        model_loaded = False
        error_msg = str(e)
        return jsonify({
            "status": "unhealthy", 
            "model_loaded": False,
            "error": error_msg
        }), 500
        
    return jsonify({"status": "healthy", "model_loaded": True})

if __name__ == '__main__':
    # Try to load model on startup, but continue even if it fails
    # so the API server can still run and report health status
    try:
        init_model()
        print("Model initialized successfully at startup")
    except Exception as e:
        print(f"Warning: Could not initialize model at startup: {str(e)}")
        print("The API server will still start, but the model will need to be fixed")
    
    # Default port is 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)