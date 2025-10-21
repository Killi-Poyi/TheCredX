from classifier.model_service import classify_text

content = "this article will tell you about sport improvements that can take place in 2024 "
category = classify_text(content)['label']
print("Category:", category)
