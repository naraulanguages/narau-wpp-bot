from flask import Flask, request, jsonify

app = Flask(__name__)
# Armazenar estado dos usuários (em memória, só para teste)
user_states = {}

# Mensagem de boas-vindas
welcome_message = """Olá! Bem-vindo à Narau Languages.
Como podemos te ajudar hoje?
1️⃣ Agendar aula teste
2️⃣ Informações sobre metodologia
3️⃣ Falar com suporte
Responda com 1, 2 ou 3."""

schedule_message = """Qual aula você gostaria de agendar?
1️⃣ Inglês
2️⃣ Espanhol
3️⃣ Japonês"""

# Função para processar mensagens
def process_user_input(user_id, message):
    state = user_states.get(user_id, "MAIN")

    if state == "MAIN":
        if message == "1":
            user_states[user_id] = "SCHEDULE"
            return schedule_message
        elif message == "2":
            return "Nossa metodologia é focada em prática e conversação. Saiba mais: https://narau.com/metodologia"
        elif message == "3":
            return "Você será transferido para nosso suporte. Aguarde alguns instantes."
        else:
            return "Desculpe, não entendi. Por favor, responda 1, 2 ou 3."
    
    elif state == "SCHEDULE":
        # Submenu aulas
        if message == "1":
            user_states[user_id] = "MAIN"
            return "Você escolheu Inglês! Encaminhando para o responsável..."
        elif message == "2":
            user_states[user_id] = "MAIN"
            return "Você escolheu Espanhol! Encaminhando para o responsável..."
        elif message == "3":
            user_states[user_id] = "MAIN"
            return "Você escolheu Japonês! Encaminhando para o responsável..."
        else:
            return "Opção inválida. Por favor, escolha 1, 2 ou 3."

# Endpoint para simular envio de mensagens
@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    user_id = data.get("user_id", "test_user")  # No WhatsApp real, seria o número do usuário
    message = data.get("message", "")

    # Se não enviar mensagem, envia boas-vindas
    if message == "":
        return jsonify({"reply": welcome_message})

    reply = process_user_input(user_id, message)
    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
