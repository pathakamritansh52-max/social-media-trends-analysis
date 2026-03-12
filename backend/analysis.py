import pandas as pd
from textblob import TextBlob
import json
import os

def analyze_trends(csv_path):
    # Read the data
    df = pd.read_csv(csv_path)
    
    # Preprocessing
    df['date'] = df['timestamp'].apply(lambda x: x.split(' ')[0])
    df['engagement'] = df['likes'] + df['comments'] + df['shares']
    
    # 1. Top Trending Hashtags (by total likes)
    trending_hashtags = df.groupby('hashtag')['likes'].sum().sort_values(ascending=False).head(5).to_dict()
    
    # 2. Most Active Users (by total engagement)
    active_users = df.groupby('user_handle')['engagement'].sum().sort_values(ascending=False).head(5).to_dict()
    
    # 3. Sentiment Analysis (using TextBlob)
    sentiment_results = {"positive": 0, "neutral": 0, "negative": 0}
    for text in df['content']:
        blob = TextBlob(str(text))
        polarity = blob.sentiment.polarity
        if polarity > 0.1:
            sentiment_results["positive"] += 1
        elif polarity < -0.1:
            sentiment_results["negative"] += 1
        else:
            sentiment_results["neutral"] += 1
            
    # 4. Summary Stats
    summary = {
        "total_posts": len(df),
        "total_likes": int(df['likes'].sum()),
        "total_comments": int(df['comments'].sum()),
        "total_shares": int(df['shares'].sum())
    }

    # 5. Daily Activity
    daily_activity = df.groupby('date').size().to_dict()

    # 6. Hashtag Growth
    hashtag_growth = {}
    top_5_tags = list(trending_hashtags.keys())
    for tag in top_5_tags:
        tag_data = df[df['hashtag'] == tag].groupby('date')['likes'].sum().to_dict()
        hashtag_growth[tag] = tag_data

    # 7. Leaderboard
    leaderboard = df.sort_values(by='engagement', ascending=False).head(5)[['user_handle', 'content', 'hashtag', 'engagement']].to_dict(orient='records')
    
    return {
        "trending_hashtags": trending_hashtags,
        "active_users": active_users,
        "sentiment": sentiment_results,
        "summary": summary,
        "daily_activity": daily_activity,
        "hashtag_growth": hashtag_growth,
        "leaderboard": leaderboard,
        "all_posts": df[['timestamp', 'date', 'user_handle', 'hashtag', 'content', 'likes', 'engagement']].to_dict(orient='records')
    }
