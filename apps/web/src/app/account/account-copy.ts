const CREATE_ACCOUNT = 'Criar conta';

// Copy for account screens (spec 09, "Cadastro e ativação"), pt-BR, second person.

export const AccountCopy = {
  name: 'Seu nome',
  email: 'E-mail',
  password: 'Senha',
  passwordHint: 'Pelo menos 8 caracteres.',
  backToLogin: 'Voltar para entrar',
  createAccount: CREATE_ACCOUNT,
  forgotPassword: 'Esqueci minha senha',
  generic: 'Não deu certo agora. Tente de novo em alguns minutos.',
  offline: 'Sem conexão com a internet. Confira o sinal e tente de novo.',
} as const;

export const SignUpCopy = {
  title: CREATE_ACCOUNT,
  subtitle: 'Teste o assistente no simulador antes de conectar o seu WhatsApp.',
  submit: CREATE_ACCOUNT,
  submitting: 'Criando…',
  exists: 'Já existe uma conta com este e-mail. Entre ou recupere a senha.',
  shortPassword: 'A senha precisa ter pelo menos 8 caracteres.',
  haveAccount: 'Já tenho conta',
} as const;

export const CheckEmailCopy = {
  title: 'Confirme seu e-mail',
  body: (email: string) =>
    `Enviamos um link para ${email}. Abra o e-mail e toque no link para continuar. Confira também a caixa de spam.`,
  resend: 'Reenviar o link',
  resent: 'Link reenviado.',
} as const;

export const ForgotCopy = {
  title: 'Recuperar a senha',
  subtitle: 'Enviamos um link para você criar uma senha nova.',
  submit: 'Enviar link',
  submitting: 'Enviando…',
  sent: 'Se existir uma conta com este e-mail, o link chega em alguns minutos.',
} as const;

export const ResetCopy = {
  title: 'Criar senha nova',
  submit: 'Salvar senha',
  submitting: 'Salvando…',
  invalid: 'Este link expirou ou já foi usado. Peça um novo.',
  done: 'Senha alterada. Entre com a senha nova.',
} as const;

export const StartCopy = {
  title: 'Seu consultório',
  subtitle: 'Como os pacientes conhecem o seu consultório? Você pode mudar depois.',
  name: 'Nome do consultório',
  namePlaceholder: 'Consultório Dr. Rafael',
  submit: 'Continuar',
  submitting: 'Criando…',
} as const;
