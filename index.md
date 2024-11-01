---
layout: home
title: もくじ
---

{% assign posts = site.pages | where: "layout", "post" %}

<div class="post-list">
  <h2>記事一覧</h2>
  {% if posts.size > 0 %}
    <ul>
      {% for post in posts %}
        <li>
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </li>
      {% endfor %}
    </ul>
  {% else %}
    <p>投稿が見つかりませんでした。</p>
  {% endif %}
</div>

{% include social.html %}
