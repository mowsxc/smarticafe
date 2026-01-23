use magic_crypt::{new_magic_crypt, MagicCryptTrait};
use std::sync::OnceLock;

// In a real app, this should be an env var or compiled secret
const SECRET_KEY: &str = "Smarticafe_Secure_Profile_Key_2026"; 

fn get_crypt() -> impl MagicCryptTrait {
    new_magic_crypt!(SECRET_KEY, 256)
}

pub fn encrypt_data(plain: &str) -> String {
    if plain.is_empty() { return String::new(); }
    get_crypt().encrypt_str_to_base64(plain)
}

pub fn decrypt_data(cipher: &str) -> String {
    if cipher.is_empty() { return String::new(); }
    // If decryption fails (e.g. bad format), return empty or original to prevent crash
    match get_crypt().decrypt_base64_to_string(cipher) {
        Ok(s) => s,
        Err(_) => String::from(""), 
    }
}
