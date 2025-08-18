---
title: "Contact Me"
layout: page
permalink: /contact/
---

If you're interested in working together—whether it's long-term DevOps contracts, fractional CTO advising, or short-term automation work—feel free to reach out using the form below.

<div class="contact-form">
  <form action="https://formspree.io/f/xovlzngj" method="POST">
    <label for="name">Name</label><br>
    <input type="text" name="name" id="name" required><br><br>

    <label for="email">Email</label><br>
    <input type="email" name="_replyto" id="email" required><br><br>

    <label for="message">Message</label><br>
    <textarea name="message" id="message" rows="6" required></textarea><br><br>

    <!-- reCAPTCHA widget -->
    <div class="g-recaptcha" data-sitekey="6LdAmakrAAAAABiUSsD7ImLTVTtLuWy5KeSD8ZlO"></div><br>

    <button type="submit">Send</button>
  </form>
</div>

<script src="https://www.google.com/recaptcha/api.js" async defer></script>

<style>

.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #444;
  border-radius: 4px;
  background-color: #1e1e1e;
  color: #fff;
}

.contact-form button {
  background-color: #90caf9;
  color: #000;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.contact-form button:hover {
  background-color: #64b5f6;

}
</style>