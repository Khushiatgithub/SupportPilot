import re
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from ..models import HistoricalConversation

class RAGService:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        self.cached_corpus: List[str] = []
        self.cached_items: List[Dict[str, Any]] = []
        self.tfidf_matrix = None

    def index_conversations(self, conversations: List[HistoricalConversation]):
        """Indexes historical conversation database records for fast cosine retrieval."""
        if not conversations:
            return
            
        self.cached_items = []
        self.cached_corpus = []
        
        for c in conversations:
            self.cached_items.append({
                "id": c.id,
                "brand": c.brand,
                "customer_handle": c.customer_handle,
                "incoming_tweet": c.incoming_tweet,
                "agent_reply": c.agent_reply,
                "intent": c.intent,
                "resolution_status": c.resolution_status,
                "quality_score": c.quality_score
            })
            self.cached_corpus.append(c.incoming_tweet)
            
        if self.cached_corpus:
            self.tfidf_matrix = self.vectorizer.fit_transform(self.cached_corpus)

    def search_similar(self, query_text: str, top_k: int = 3, intent_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Finds top-k most similar historical customer tickets."""
        if not self.cached_corpus or self.tfidf_matrix is None:
            return []
            
        query_vec = self.vectorizer.transform([query_text])
        similarities = cosine_similarity(query_vec, self.tfidf_matrix)[0]
        
        results = []
        indexed_scores = list(enumerate(similarities))
        # Sort descending by similarity
        indexed_scores.sort(key=lambda x: x[1], reverse=True)
        
        for idx, score in indexed_scores:
            if len(results) >= top_k:
                break
            item = self.cached_items[idx]
            if intent_filter and item["intent"] != intent_filter and score < 0.60:
                continue
            
            # Format return dict
            results.append({
                "id": item["id"],
                "similarity_score": round(float(score), 3),
                "brand": item["brand"],
                "incoming_tweet": item["incoming_tweet"],
                "agent_reply": item["agent_reply"],
                "intent": item["intent"],
                "quality_score": item["quality_score"]
            })
            
        return results

rag_service = RAGService()
