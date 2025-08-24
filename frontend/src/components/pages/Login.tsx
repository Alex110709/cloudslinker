  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Language switcher in top-right corner */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <CloudOutlined className="text-4xl text-blue-600 mr-2" />
            <Title level={2} className="m-0">
              CloudsLinker
            </Title>
          </div>
          <Text className="text-gray-600">
            {t('common.appDescription')}
          </Text>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <div className="text-center mb-6">
            <Title level={3} className="m-0">
              {t('auth.login')}
            </Title>
            <Text type="secondary">
              {t('auth.loginSubtitle')}
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={t('auth.loginFailed')}
              description={
                'data' in error 
                  ? (error.data as any)?.message || t('common.unknownError')
                  : t('common.networkError')
              }
              type="error"
              showIcon
              className="mb-4"
            />
          )}

          {/* Login Form */}
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              label={t('common.email')}
              rules={[
                { required: true, message: t('auth.emailRequired') },
                { type: 'email', message: t('auth.emailInvalid') },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder={t('auth.emailPlaceholder')}
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('common.password')}
              rules={[
                { required: true, message: t('auth.passwordRequired') },
                { min: 6, message: t('auth.passwordMinLength') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
              />
            </Form.Item>

            <div className="flex items-center justify-between mb-4">
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              >
                {t('auth.rememberMe')}
              </Checkbox>
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={isLoading}
                className="h-12 text-lg font-medium"
              >
                {t('auth.loginButton')}
              </Button>
            </Form.Item>
          </Form>

          {/* Social Login */}
          <Divider>{t('common.or')}</Divider>
          
          <Space direction="vertical" className="w-full" size="middle">
            <Button
              icon={<GoogleOutlined />}
              onClick={handleGoogleLogin}
              block
              size="large"
              className="h-12"
            >
              {t('auth.googleLogin')}
            </Button>
            
            <Button
              icon={<GithubOutlined />}
              onClick={handleGithubLogin}
              block
              size="large"
              className="h-12"
            >
              {t('auth.githubLogin')}
            </Button>
          </Space>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <Text type="secondary">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                {t('auth.signUp')}
              </Link>
            </Text>
          </div>
        </Card>

        {/* Demo Account Info */}
        <Card className="shadow-sm bg-blue-50 border-blue-200">
          <div className="text-center">
            <Text type="secondary" className="text-sm">
              <strong>{t('auth.demoAccount')}:</strong> demo@cloudslinker.com / demo123
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );