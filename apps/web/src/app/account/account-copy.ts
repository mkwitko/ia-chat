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
  subtitle: (practice: string) => `Convite para ${practice}. Crie seu acesso para começar a configuração.`,
  google: 'Criar com o Google',
  divider: 'ou com e-mail',
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

const INVITE_ONLY = 'O cadastro é só por convite';

/** H-37: no invite, no account. Shown on /criar-conta, after a refused sign-up and on bad links. */
export const InviteCopy = {
  closedTitle: INVITE_ONLY,
  closedBody:
    'Estamos abrindo vagas aos poucos. Entre na lista de espera no nosso site e mandamos o seu convite.',
  waitlist: 'Entrar na lista de espera',
  required: `${INVITE_ONLY}. Use o link do seu convite ou entre na lista de espera.`,
  loading: 'Conferindo o convite…',
  used: 'Este convite já foi usado. Se a conta é sua, é só entrar.',
  expired: 'Este convite venceu. Peça um link novo a quem te convidou.',
  cancelled: 'Este convite foi cancelado. Fale com quem te convidou.',
  invalid: 'Este link de convite não existe. Confira se copiou o endereço inteiro.',
  noPractice: 'Sua conta ainda não tem um consultório. O acesso é por convite.',
} as const;
