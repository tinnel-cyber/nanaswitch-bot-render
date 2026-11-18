<?php
/**
 * Classe Principale de la Passerelle NanaSwitch Cloud pour WooCommerce
 *
 * @package NanaSwitch_Gateway
 */

if (!defined('ABSPATH')) {
    exit;
}

class WC_Gateway_NanaSwitch extends WC_Payment_Gateway {

    /**
     * Mode d'intégration ('AGREGATED' ou 'BYOK')
     *
     * @var string
     */
    public $api_mode;

    /**
     * Clé publique NanaSwitch (ns_live_pk_...)
     *
     * @var string
     */
    public $public_key;

    /**
     * Clé secrète NanaSwitch (ns_live_sk_...)
     *
     * @var string
     */
    public $secret_key;

    /**
     * Secret de signature Webhook (ns_whsec_...)
     *
     * @var string
     */
    public $webhook_secret;

    /**
     * URL de base de l'API NanaSwitch Cloud
     *
     * @var string
     */
    public $api_base_url;

    /**
     * Journal de débogage
     *
     * @var bool
     */
    public $debug_log;

    /**
     * Constructeur
     */
    public function __construct() {
        $this->id                 = 'nanaswitch';
        $this->icon               = plugin_dir_url(dirname(__FILE__)) . 'assets/images/logo.svg';
        $this->has_fields         = false;
        $this->method_title       = __('NanaSwitch Gateway', 'nanaswitch-gateway');
        $this->method_description = __('Passerelle de paiement intelligente et multi-opérateurs (Orange Money, Moov Africa, Wave, MTN, LigdiCash) avec failover automatique.', 'nanaswitch-gateway');

        // Prise en charge des fonctionnalités WooCommerce
        $this->supports = array(
            'products',
            'refunds'
        );

        // Chargement des paramètres du panneau d'administration
        $this->init_form_fields();
        $this->init_settings();

        // Assignation des variables
        $this->title          = $this->get_option('title', __('Mobile Money & Carte (NanaSwitch)', 'nanaswitch-gateway'));
        $this->description    = $this->get_option('description', __('Payez en toute sécurité via Orange Money, Moov, Wave, MTN ou LigdiCash avec bascule intelligente en cas d\'indisponibilité.', 'nanaswitch-gateway'));
        $this->api_mode       = $this->get_option('api_mode', 'AGREGATED');
        $this->public_key     = trim($this->get_option('public_key', ''));
        $this->secret_key     = trim($this->get_option('secret_key', ''));
        $this->webhook_secret = trim($this->get_option('webhook_secret', ''));
        $this->api_base_url   = untrailingslashit($this->get_option('api_base_url', 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run'));
        $this->debug_log      = 'yes' === $this->get_option('debug_log', 'no');

        // Hook de sauvegarde des options d'administration
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));

        // Injection des styles frontend
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_styles'));
    }

    /**
     * Enfile les styles CSS légers pour le checkout
     */
    public function enqueue_frontend_styles() {
        if (is_checkout() || is_checkout_pay_page()) {
            wp_enqueue_style(
                'nanaswitch-gateway-css',
                plugin_dir_url(dirname(__FILE__)) . 'assets/css/nanaswitch.css',
                array(),
                NANASWITCH_GATEWAY_VERSION
            );
        }
    }

    /**
     * Définit les champs du formulaire d'administration WooCommerce
     */
    public function init_form_fields() {
        $webhook_url = get_rest_url(null, 'nanaswitch/v1/webhook');

        $this->form_fields = array(
            'enabled' => array(
                'title'       => __('Activer / Désactiver', 'nanaswitch-gateway'),
                'type'        => 'checkbox',
                'label'       => __('Activer la passerelle de paiement NanaSwitch', 'nanaswitch-gateway'),
                'default'     => 'no'
            ),
            'title' => array(
                'title'       => __('Titre au Checkout', 'nanaswitch-gateway'),
                'type'        => 'text',
                'description' => __('Titre affiché aux clients lors de l\'étape de paiement.', 'nanaswitch-gateway'),
                'default'     => __('Paiement Mobile Money & Carte (Orange, Moov, Wave, MTN)', 'nanaswitch-gateway'),
                'desc_tip'    => true,
            ),
            'description' => array(
                'title'       => __('Description au Checkout', 'nanaswitch-gateway'),
                'type'        => 'textarea',
                'description' => __('Texte explicatif affiché sous le titre de la passerelle au checkout.', 'nanaswitch-gateway'),
                'default'     => __('Réglez rapidement et en toute sécurité via Orange Money, Moov Africa, Wave, MTN ou LigdiCash avec aiguillage intelligent de secours.', 'nanaswitch-gateway'),
            ),
            'api_mode' => array(
                'title'       => __('Mode d\'Intégration', 'nanaswitch-gateway'),
                'type'        => 'select',
                'description' => __('Choisissez votre mode de fonctionnement NanaSwitch Cloud.', 'nanaswitch-gateway'),
                'default'     => 'AGREGATED',
                'options'     => array(
                    'AGREGATED' => __('Mode Simplifié (Agrégé) — Compte Maître NanaSwitch (+1.5% marge)', 'nanaswitch-gateway'),
                    'BYOK'      => __('Mode BYOK (SaaS / API Router) — Vos propres clés SasPay/Sebpay (0.02 XOF/req)', 'nanaswitch-gateway'),
                ),
            ),
            'public_key' => array(
                'title'       => __('Clé Publique NanaSwitch (Public Key)', 'nanaswitch-gateway'),
                'type'        => 'text',
                'description' => __('Format attendu : ns_live_pk_... (trouvable dans votre Dashboard NanaSwitch > Développeur).', 'nanaswitch-gateway'),
                'default'     => '',
                'placeholder' => 'ns_live_pk_xxxxxxxxxxxxxxxxxxxxxxxx',
            ),
            'secret_key' => array(
                'title'       => __('Clé Secrète NanaSwitch (Secret Key)', 'nanaswitch-gateway'),
                'type'        => 'password',
                'description' => __('Format attendu : ns_live_sk_... Utilisée pour signer vos requêtes HTTP sécurisées.', 'nanaswitch-gateway'),
                'default'     => '',
                'placeholder' => 'ns_live_sk_xxxxxxxxxxxxxxxxxxxxxxxx',
            ),
            'webhook_secret' => array(
                'title'       => __('Secret de Signature Webhook', 'nanaswitch-gateway'),
                'type'        => 'password',
                'description' => __('Format attendu : ns_whsec_... Utilisé pour valider les signatures cryptographiques HMAC-SHA256.', 'nanaswitch-gateway'),
                'default'     => '',
                'placeholder' => 'ns_whsec_xxxxxxxxxxxxxxxxxxxxxxxx',
            ),
            'api_base_url' => array(
                'title'       => __('URL Endpoint API NanaSwitch Cloud', 'nanaswitch-gateway'),
                'type'        => 'text',
                'description' => __('Serveur d\'API Node.js de production par défaut.', 'nanaswitch-gateway'),
                'default'     => 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run',
            ),
            'debug_log' => array(
                'title'       => __('Journal de Débogage (Debug Log)', 'nanaswitch-gateway'),
                'type'        => 'checkbox',
                'label'       => __('Activer l\'écriture des journaux dans WooCommerce > État > Journaux (nanaswitch-...)', 'nanaswitch-gateway'),
                'default'     => 'no'
            ),
        );
    }

    /**
     * Rendu personnalisé des options d'administration avec instructions Webhook
     */
    public function admin_options() {
        $webhook_url = get_rest_url(null, 'nanaswitch/v1/webhook');
        ?>
        <h2><?php echo esc_html($this->method_title); ?></h2>
        <p><?php echo esc_html($this->method_description); ?></p>

        <div class="nanaswitch-admin-note" style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1e40af;padding:14px 18px;border-radius:8px;margin-bottom:20px;">
          <h4 style="margin:0 0 6px;color:#1e40af;font-weight:bold;">🔗 URL de Webhook à configurer dans votre Console NanaSwitch :</h4>
          <p style="margin:0 0 8px;font-size:13px;color:#1e3a8a;">
            Copiez l'URL suivante et collez-la dans votre onglet <strong>Webhooks</strong> sur NanaSwitch Cloud pour recevoir les confirmations automatiques de paiement :
          </p>
          <code style="display:inline-block;padding:6px 10px;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;color:#0f172a;font-weight:bold;user-select:all;">
            <?php echo esc_url($webhook_url); ?>
          </code>
        </div>

        <table class="form-table">
            <?php $this->generate_settings_html(); ?>
        </table>
        <?php
    }

    /**
     * Affichage au checkout avec badges opérateurs
     */
    public function payment_fields() {
        if ($this->description) {
            echo '<p class="nanaswitch-payment-desc">' . wp_kses_post($this->description) . '</p>';
        }

        echo '<div class="nanaswitch-operators-badge">
            <span class="nanaswitch-op-pill orange">🟠 Orange Money</span>
            <span class="nanaswitch-op-pill moov">🔵 Moov Africa</span>
            <span class="nanaswitch-op-pill wave">🌊 Wave</span>
            <span class="nanaswitch-op-pill mtn">🟡 MTN Mobile Money</span>
            <span class="nanaswitch-op-pill">🟢 LigdiCash / Cartes</span>
        </div>';
    }

    /**
     * Traite le paiement lors de la soumission de la commande (process_payment)
     *
     * @param int $order_id
     * @return array
     */
    public function process_payment($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) {
            wc_add_notice(__('Commande introuvable.', 'nanaswitch-gateway'), 'error');
            return array('result' => 'failure');
        }

        // Vérification des clés d'API
        if (empty($this->secret_key) || empty($this->public_key)) {
            $this->log('Clés d\'API manquantes dans la configuration NanaSwitch.');
            wc_add_notice(__('La passerelle de paiement NanaSwitch n\'est pas encore configurée (clés d\'API manquantes).', 'nanaswitch-gateway'), 'error');
            return array('result' => 'failure');
        }

        $amount   = round($order->get_total());
        $currency = $order->get_currency();
        $country  = $order->get_billing_country() ?: 'BF';
        $ref      = 'WC_' . $order_id . '_' . time();

        $callback_url = get_rest_url(null, 'nanaswitch/v1/webhook');
        $return_url   = $this->get_return_url($order);

        // Composition du payload conforme au moteur NanaSwitch Cloud
        $payload = array(
            'amount'             => $amount,
            'currency'           => $currency,
            'country'            => strtoupper($country),
            'orderId'            => (string) $order_id,
            'order_id'           => (string) $order_id,
            'reference'          => $ref,
            'externalReference'  => $ref,
            'external_reference' => $ref,
            'returnUrl'          => $return_url,
            'redirect_url'       => $return_url,
            'callbackUrl'        => $callback_url,
            'callback_url'       => $callback_url,
            'customer'           => array(
                'name'      => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
                'firstName' => $order->get_billing_first_name(),
                'lastName'  => $order->get_billing_last_name(),
                'email'     => $order->get_billing_email(),
                'phone'     => $order->get_billing_phone(),
                'country'   => strtoupper($country),
            ),
            'customerPhone'      => $order->get_billing_phone(),
            'customerEmail'      => $order->get_billing_email(),
            'description'        => sprintf(__('Commande #%s sur %s', 'nanaswitch-gateway'), $order_id, get_bloginfo('name')),
            'metadata'           => array(
                'source'       => 'woocommerce',
                'wc_order_id'  => $order_id,
                'wc_version'   => WC()->version,
                'api_mode'     => $this->api_mode,
            )
        );

        $endpoint_url = $this->api_base_url . '/v1/switch/route';

        $this->log(sprintf('Initiation paiement commande #%s vers %s : %s %s', $order_id, $endpoint_url, $amount, $currency));

        // Envoi de la requête HTTP vers NanaSwitch Cloud
        $response = wp_remote_post($endpoint_url, array(
            'method'      => 'POST',
            'timeout'     => 30,
            'redirection' => 5,
            'httpversion' => '1.1',
            'headers'     => array(
                'Content-Type'        => 'application/json',
                'Authorization'       => 'Bearer ' . $this->secret_key,
                'x-nanaswitch-skey'   => $this->secret_key,
                'x-nanaswitch-key'    => $this->public_key,
                'User-Agent'          => 'NanaSwitch-WooCommerce/' . NANASWITCH_GATEWAY_VERSION
            ),
            'body'        => wp_json_encode($payload),
        ));

        // Gestion des erreurs de communication réseau
        if (is_wp_error($response)) {
            $error_message = $response->get_error_message();
            $this->log('Erreur cURL / Réseau : ' . $error_message);
            wc_add_notice(__('Erreur de communication avec le serveur de paiement. Veuillez réessayer.', 'nanaswitch-gateway'), 'error');
            return array('result' => 'failure');
        }

        $status_code = wp_remote_retrieve_response_code($response);
        $body        = wp_remote_retrieve_body($response);
        $data        = json_decode($body, true);

        $this->log(sprintf('Réponse NanaSwitch (Code %s) : %s', $status_code, $body));

        // 1. Coupe-circuit Risque KYC (403 Forbidden - Plafond mensuel atteint)
        if ($status_code === 403) {
            $msg = !empty($data['message']) ? $data['message'] : __('Plafond mensuel de transactions atteint pour cette boutique.', 'nanaswitch-gateway');
            $this->log('Rejet 403 KYC : ' . $msg);
            wc_add_notice(sprintf(__('Paiement temporairement indisponible : %s', 'nanaswitch-gateway'), esc_html($msg)), 'error');
            return array('result' => 'failure');
        }

        // 2. Coupe-circuit Crédits API SaaS (402 Payment Required)
        if ($status_code === 402) {
            $this->log('Rejet 402 Crédits API épuisés');
            wc_add_notice(__('Service de paiement temporairement indisponible (solde de crédits API à recharger).', 'nanaswitch-gateway'), 'error');
            return array('result' => 'failure');
        }

        // 3. Succès et redirection vers la session de paiement
        if (($status_code === 200 || $status_code === 201) && !empty($data)) {
            
            // Extraction de l'URL de redirection fournie par NanaSwitch
            $redirect_url = '';
            if (!empty($data['checkout_url'])) {
                $redirect_url = $data['checkout_url'];
            } elseif (!empty($data['payment_url'])) {
                $redirect_url = $data['payment_url'];
            } elseif (!empty($data['redirect_url'])) {
                $redirect_url = $data['redirect_url'];
            } elseif (!empty($data['data']['checkout_url'])) {
                $redirect_url = $data['data']['checkout_url'];
            } elseif (!empty($data['data']['payment_url'])) {
                $redirect_url = $data['data']['payment_url'];
            }

            $tx_id = !empty($data['transaction_id']) ? $data['transaction_id'] : $ref;

            // Enregistrement des métadonnées de la transaction sur la commande
            $order->update_meta_data('_nanaswitch_transaction_id', $tx_id);
            $order->update_meta_data('_nanaswitch_reference', $ref);
            $order->update_meta_data('_nanaswitch_mode', $this->api_mode);
            $order->save_meta_data();

            $order->add_order_note(sprintf(
                __('Session de paiement NanaSwitch initialisée. Référence : %s | Transaction : %s', 'nanaswitch-gateway'),
                esc_html($ref),
                esc_html($tx_id)
            ));

            // Si aucune redirection externe requise (ex: push direct simulé ou approuvé d'office)
            if (empty($redirect_url)) {
                $order->payment_complete($tx_id);
                $order->add_order_note(__('Paiement NanaSwitch validé directement sans redirection.', 'nanaswitch-gateway'));
                WC()->cart->empty_cart();
                return array(
                    'result'   => 'success',
                    'redirect' => $this->get_return_url($order),
                );
            }

            // Réduction des stocks et vidage du panier
            WC()->cart->empty_cart();

            return array(
                'result'   => 'success',
                'redirect' => esc_url_raw($redirect_url),
            );
        }

        // 4. Erreur générique
        $err_msg = !empty($data['message']) ? $data['message'] : (!empty($data['error']) ? $data['error'] : __('Échec de l\'initialisation du paiement.', 'nanaswitch-gateway'));
        $this->log('Erreur initialisation : ' . $err_msg);
        wc_add_notice(sprintf(__('Erreur de paiement NanaSwitch : %s', 'nanaswitch-gateway'), esc_html($err_msg)), 'error');
        return array('result' => 'failure');
    }

    /**
     * Écrit dans les logs WooCommerce si debug_log est activé
     *
     * @param string $message
     */
    public function log($message) {
        if ($this->debug_log) {
            $logger = wc_get_logger();
            $logger->info($message, array('source' => 'nanaswitch'));
        }
    }
}
