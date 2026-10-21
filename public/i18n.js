(function () {
  'use strict';

  var ZH = {
    /* ---- shared ---- */
    'Loading...': '加载中…', 'Loading prices...': '正在加载价格…', 'Close': '关闭', 'Open': '打开', 'Delete': '删除',
    'Remove': '移除', 'Download': '下载', 'Try again': '重试', 'Working...': '处理中…', 'Saved!': '已保存!',
    'Uploading...': '正在上传…', 'Upload failed.': '上传失败。', 'Could not read that image.': '无法读取该图片。',
    'Something went wrong. Please try again.': '出错了,请重试。',
    'Could not reach the server. Please try again.': '无法连接服务器,请重试。',
    'Too many attempts. Please wait a few minutes and try again.': '尝试次数过多,请稍等几分钟后再试。',
    'Too many uploads. Please wait a few minutes.': '上传过于频繁,请稍等几分钟。',
    '.': '。', 'Support': '支持', 'Privacy': '隐私', 'Terms': '条款', 'Privacy Policy': '隐私政策', 'Terms of Service': '服务条款',
    'Media Engine - Dashboard': 'Media Engine - 控制台',

    /* ---- login ---- */
    'Log in - Media Engine': '登录 - Media Engine', 'Welcome back': '欢迎回来',
    'Email confirmed. You can log in now.': '邮箱已确认,现在可以登录了。',
    'Email': '邮箱', 'Password': '密码', 'Your password': '请输入密码', 'Log in': '登录', 'Logging in...': '正在登录…',
    'Forgot your password?': '忘记密码?', 'New here?': '新用户?', 'Create an account': '创建账号',
    '← Back to home': '← 返回首页',
    'Please enter your email and password.': '请输入邮箱和密码。', 'Login failed.': '登录失败。',
    'Invalid login credentials': '邮箱或密码不正确。', 'Email not confirmed': '邮箱尚未确认,请先点击确认邮件中的链接。',

    /* ---- signup ---- */
    'Create your account - Media Engine': '创建账号 - Media Engine', 'Create your account in under a minute': '一分钟内创建您的账号',
    'Personal information': '个人信息', 'Full name': '姓名', 'e.g. Jane Wanjiru': '例如:王小明',
    'Phone number': '手机号码', '+254 7XX XXX XXX': '+86 138 0000 0000', 'Country': '国家/地区',
    'Select country': '请选择国家/地区', 'Kenya': '肯尼亚', 'China': '中国', 'United States': '美国', 'United Kingdom': '英国',
    'Nigeria': '尼日利亚', 'Ghana': '加纳', 'South Africa': '南非', 'Uganda': '乌干达', 'Tanzania': '坦桑尼亚', 'India': '印度',
    'United Arab Emirates': '阿联酋', 'Canada': '加拿大', 'Australia': '澳大利亚', 'Germany': '德国', 'Other': '其他',
    'Account details': '账号信息', 'Email address': '邮箱地址', 'Create a password': '设置密码', 'At least 8 characters.': '至少 8 个字符。',
    'Confirm password': '确认密码', 'Type the password again': '再次输入密码',
    'I have read and agree to the': '我已阅读并同意', 'and the': '和',
    'Create account': '创建账号', 'Creating account...': '正在创建账号…', 'Already have an account?': '已有账号?',
    'Please enter your full name.': '请输入姓名。', 'Please enter your phone number.': '请输入手机号码。',
    'Please select your country.': '请选择国家/地区。', 'Please enter a valid email address.': '请输入有效的邮箱地址。',
    'Password must be at least 8 characters.': '密码至少需要 8 个字符。', 'The two passwords do not match.': '两次输入的密码不一致。',
    'Please accept the Terms of Service to continue.': '请先同意服务条款。',
    'Name, email and password are required.': '姓名、邮箱和密码为必填项。', 'You must accept the Terms of Service.': '您必须同意服务条款。',
    'Account created': '账号已创建', 'We sent a confirmation link to': '我们已向以下邮箱发送确认链接:',
    'Click it, then log in.': '请点击链接,然后登录。', 'Go to log in': '前往登录',
    'User already registered': '该邮箱已注册。', 'Error sending confirmation email': '确认邮件发送失败,请稍后再试。',

    /* ---- forgot / reset ---- */
    'Reset password - Media Engine': '重置密码 - Media Engine', 'Reset your password': '重置密码', 'Your account email': '您的账号邮箱',
    'Send reset link': '发送重置链接', 'Sending...': '正在发送…', '← Back to log in': '← 返回登录',
    'If an account exists for that email, we have sent a reset link. Check your inbox (and spam folder).': '如果该邮箱已注册,我们已发送重置链接。请查看收件箱(以及垃圾邮件文件夹)。',
    'Please enter your email.': '请输入邮箱。',
    'Choose a new password - Media Engine': '设置新密码 - Media Engine', 'Choose a new password': '设置新密码', 'New password': '新密码',
    'At least 8 characters': '至少 8 个字符', 'Confirm new password': '确认新密码', 'Type it again': '再次输入',
    'Save new password': '保存新密码', 'Saving...': '正在保存…', 'This reset link is invalid or has expired.': '此重置链接无效或已过期。',
    'Request a new link': '重新获取链接', 'Password updated': '密码已更新',
    'This reset link is invalid or has expired. Please request a new one.': '此重置链接无效或已过期,请重新申请。',
    'Please enter a new password of at least 8 characters.': '请输入至少 8 个字符的新密码。',

    /* ---- landing ---- */
    'Media Engine - Generate Professional Media in Seconds': 'Media Engine - 几秒钟生成专业设计',
    'Log In': '登录', 'Create free account': '免费创建账号', 'Generate Professional Media in Seconds': '几秒钟生成专业设计图',
    'Create business cards, staff ID cards, certificates, posters and banners in standard print sizes. Design for free and pay only when you generate.': '按标准印刷尺寸制作名片、员工证件、证书、海报和横幅。免费设计,生成时才付费。',
    'How It Works': '使用流程', 'Choose a product': '选择产品', 'Business cards, ID cards, certificates, posters and web banners.': '名片、证件、证书、海报和网页横幅。',
    'Add your details': '填写您的信息', 'Add your company, photo, signatures and colours, and watch the design update live.': '添加公司、照片、签名和颜色,实时查看设计效果。',
    'Download in high resolution': '下载高清图片', 'Pay per image or choose a pass, then download print-ready images.': '按张付费或选择套餐,然后下载可直接印刷的图片。',
    'What You Can Create': '您可以制作', 'Business Cards': '名片', 'Clean, professional cards in the standard 90 x 54 mm size.': '标准 90 x 54 毫米尺寸,简洁专业。',
    'Staff ID Cards': '员工证件', 'Photo ID cards with your logo, role and contact details.': '带照片的证件,含标志、职务和联系方式。',
    'Certificates': '证书', 'A4 certificates with signatures, a logo and a professional layout.': 'A4 证书,含签名、标志和专业版式。',
    'Posters and Banners': '海报和横幅', 'A3 posters and web banners with your picture, text and brand colours.': 'A3 海报和网页横幅,使用您的图片、文字和品牌色。',
    'Simple Pricing': '简单透明的价格', 'LOWEST PRICE PER IMAGE': '单价最低', 'Get started': '开始使用',
    'Creating an account and designing are free. No pass? You can pay per image when you generate. Passes do not renew automatically.': '创建账号和设计都是免费的。没有套餐?生成时可按张付费。套餐不会自动续费。',
    'Ready to save hours on design?': '想节省大量设计时间?',
    'Prices are shown after you create a free account.': '创建免费账号后即可查看价格。',
    'Daily Pass': '日卡', 'Weekly Pass': '周卡', 'Monthly Pass': '月卡', 'Starter Plan': '入门套餐',
    'All products and CSV batch': '所有产品与 CSV 批量生成',

    /* ---- dashboard: top ---- */
    'Account': '账号', 'Log Out': '退出登录', 'Account settings': '账号设置',
    'Overview': '概览', 'Plans': '套餐', 'Studio': '设计室', 'History': '历史记录', 'Brand': '品牌', 'Settings': '设置', 'Admin': '管理',
    'Name': '姓名', 'Phone': '电话', 'Member since': '注册时间', 'Pass': '套餐', 'Usage': '用量', 'No active pass': '暂无有效套餐',
    'Confirming your payment...': '正在确认您的付款…', 'Payment received. Your images are being made.': '已收到付款,正在为您生成图片。',
    'Payment received. Thank you!': '已收到付款,谢谢!', 'Payment confirmed. Thank you!': '付款已确认,谢谢!',
    'We have not received confirmation yet. Refresh this page in a minute. If you were charged, contact support.': '尚未收到付款确认。请一分钟后刷新页面。如果您已被扣款,请联系客服。',
    'Could not confirm the payment.': '无法确认付款。',
    'We could not read the payment reference. If you were charged, contact support.': '无法读取付款编号。如果您已被扣款,请联系客服。',
    'You have an Alipay payment waiting.': '您有一笔支付宝付款待处理。',

    /* ---- dashboard: overview ---- */
    'Open Studio': '打开设计室', 'Design for free. Pay per image, or choose a pass, only when you generate.': '免费设计。仅在生成时才需按张付费或选择套餐。',
    'Pass generations used': '已用套餐额度', 'Pass remaining': '套餐剩余', 'Days left': '剩余天数', 'Saved designs': '已保存设计', 'No expiry': '无期限',
    'Pass usage': '套餐用量', 'Images made, last 7 days': '近 7 天生成数量', 'used': '已用',
    'Included:': '包含:', 'Extra credits:': '额外额度:', 'Used:': '已用:', 'No active pass yet': '暂无有效套餐',

    /* ---- dashboard: plans ---- */
    'Pay in': '支付币种', 'Kenyan Shilling (KES) - M-PESA or card': '肯尼亚先令 (KES) - M-PESA 或银行卡',
    'US Dollar (USD) - card': '美元 (USD) - 银行卡', 'Chinese Yuan (CNY) - Alipay QR code': '人民币 (CNY) - 支付宝扫码',
    'You have no active pass. Everything is free to explore.': '您暂无有效套餐。所有功能均可免费体验。',
    'Your current pass is active.': '您当前的套餐有效。', 'Pass active': '套餐生效中',
    'Opening the secure payment page...': '正在打开安全支付页面…',
    'Designing and previewing are free. A pass starts when your payment is confirmed and does not renew automatically.': '设计和预览免费。套餐在付款确认后生效,不会自动续费。',
    'Need more generations?': '需要更多额度?', '100 extra generations:': '100 张额外额度:', 'Buy 100 more': '再购买 100 张',
    'Unknown pass.': '未知套餐。', 'Unknown pack or currency.': '未知的额度包或币种。', 'That currency is not available yet.': '该币种暂不可用。',
    'You need an active pass first.': '您需要先购买有效套餐。', 'Alipay payments are not available yet.': '支付宝付款暂不可用。',
    'You have too many unfinished payments. Please finish or wait for them to be checked.': '您有太多未完成的付款,请先完成或等待核对。',
    'Payment not found.': '未找到该付款记录。',

    /* ---- dashboard: studio ---- */
    'Product': '产品', 'Style': '样式', 'Details': '详情', 'Finish': '完成', 'My saved designs': '我保存的设计',
    '1. What do you want to create?': '1. 您想制作什么?', 'Sizes are standard print sizes and images are made in high resolution.': '尺寸为标准印刷尺寸,图片为高清输出。',
    'Continue →': '继续 →', '← Back': '← 返回',
    'Business Card': '名片', 'Staff ID Card': '员工证件', 'Certificate': '证书', 'Poster': '海报', 'Web Banner': '网页横幅',
    '90 x 54 mm': '90 x 54 毫米', '54 x 86 mm (portrait)': '54 x 86 毫米(竖版)', 'A4 landscape, 297 x 210 mm': 'A4 横版,297 x 210 毫米',
    'A3 portrait, 297 x 420 mm': 'A3 竖版,297 x 420 毫米',
    '2. Choose a style and colours': '2. 选择样式和颜色', 'Modern': '现代', 'Classic': '经典', 'Text on the design': '设计上的文字语言', 'English': '英文',
    'Colour palettes': '配色方案', 'Fine-tune colours': '微调颜色', 'Main': '主色', 'Accent': '强调色', 'Background': '背景色', 'Text': '文字色',
    'Royal': '皇家蓝', 'Ocean': '海洋', 'Forest': '森林', 'Sunset': '日落', 'Gold': '金色', 'Night': '暗夜',
    '3. Add your details': '3. 填写您的信息', 'Replace the example text with your own. Empty fields are left out of the design.': '请把示例文字替换为您自己的内容。留空的项目不会出现在设计中。',
    'Company name': '公司名称', 'Your name': '您的姓名', 'Job title': '职位', 'Website': '网站', 'Location / address': '地点 / 地址',
    'Tagline (optional)': '标语(可选)', 'Logo': '标志(Logo)', 'Role / department': '职务 / 部门', 'ID number': '证件号码', 'Valid until': '有效期至',
    'Passport photo': '证件照', 'Organisation name': '机构名称', 'Certificate title': '证书标题', 'Recipient name': '获奖者姓名',
    'What is it for?': '颁发事由', 'Date': '日期', 'Location': '地点', 'First signer name': '第一签署人姓名', 'First signer title': '第一签署人职务',
    'First signature': '第一签名', 'Second signer name (optional)': '第二签署人姓名(可选)', 'Second signer title': '第二签署人职务',
    'Second signature': '第二签名', 'Headline': '主标题', 'Subtitle': '副标题', 'Company / organiser': '公司 / 主办方', 'Main picture': '主图',
    'Button / offer text': '按钮 / 优惠文字', 'Product picture': '产品图片',
    'PNG or JPG. A transparent PNG looks best.': '支持 PNG 或 JPG,透明背景的 PNG 效果最佳。',
    'Passport-style photo. A plain background works best.': '证件照风格,纯色背景效果最佳。',
    'Sign on white paper, take a photo or scan it, then upload.': '在白纸上签名,拍照或扫描后上传。',
    'A wide, bright picture works best.': '横向、明亮的图片效果最佳。', 'A clear picture of your product or team.': '清晰的产品或团队照片。',
    '4. Finish': '4. 完成', 'Make many images at once (optional)': '批量生成多张图片(可选)', 'Download a sample CSV': '下载示例 CSV',
    '. Columns you leave out use the text from step 3. If it contains Chinese, save it as CSV UTF-8.': '。未包含的列将使用第 3 步中的文字。如果包含中文,请另存为 CSV UTF-8 格式。',
    'No usable rows found. Check the column headings.': '未找到可用的行,请检查列标题。',
    '×': '×', 'Prefer a pass?': '更想用套餐?', 'See passes': '查看套餐',
    'Save this design for later': '保存此设计以便日后使用', 'Design name': '设计名称', 'Save design': '保存设计', 'Please give your design a name.': '请为设计命名。',
    'Nothing saved yet. Use "Save design" on the last step.': '还没有保存的设计。请在最后一步点击“保存设计”。',
    'Something went wrong': '出错了', 'Your payment is safe. Press try again to continue where it stopped.': '您的付款是安全的。请点击“重试”从中断处继续。',
    'Waiting for payment confirmation...': '正在等待付款确认…',
    'Unknown product.': '未知产品。', 'One of your images is not allowed. Please upload it again.': '有图片不被允许,请重新上传。',
    'You need an active pass.': '您需要有效的套餐。', 'Invalid design.': '设计无效。', 'Order not found.': '未找到订单。',

    /* ---- dashboard: history / brand / settings ---- */
    'My Downloads': '我的下载', 'No images yet.': '还没有图片。', 'Design': '设计',
    'Brand Settings': '品牌设置', 'Your business name, logo and colour are filled into new designs automatically.': '您的公司名称、标志和颜色会自动填入新设计。',
    'Business Name': '公司名称', 'e.g. Pinnacle Edge Ltd': '例如:Pinnacle Edge Ltd', 'Detect Brand Color from Logo': '从标志中识别品牌色',
    'Save Brand Settings': '保存品牌设置', 'Please upload a logo first.': '请先上传标志。',
    'Logo uploaded. Click Save Brand Settings to keep it.': '标志已上传,请点击“保存品牌设置”以保留。',
    'Could not detect a color from this image.': '无法从该图片识别颜色。', 'Color detected! Save to keep it.': '已识别颜色!请保存以保留。',
    'Could not read this image.': '无法读取该图片。', 'Could not load that image.': '无法加载该图片。', 'Brand settings saved!': '品牌设置已保存!',
    'Personal Information': '个人信息', 'Save Personal Information': '保存个人信息', 'Login & Security': '登录与安全', 'Current email:': '当前邮箱:',
    'Current Password (required)': '当前密码(必填)', 'Your current password': '您的当前密码', 'New Email (optional)': '新邮箱(可选)',
    'Leave blank to keep current email': '留空则保持当前邮箱不变', 'New Password (optional)': '新密码(可选)',
    'Leave blank to keep current password': '留空则保持当前密码不变', 'Save Changes': '保存更改',
    'Please enter your current password.': '请输入当前密码。', 'Enter a new email or a new password.': '请输入新邮箱或新密码。',
    'New password must be at least 8 characters.': '新密码至少需要 8 个字符。',
    'Account updated! Please log in again with your new details.': '账号已更新!请使用新信息重新登录。',
    'Your current password is incorrect.': '当前密码不正确。', 'Nothing to update': '没有需要更新的内容', 'Please enter your name.': '请输入姓名。',

    /* ---- Alipay ---- */
    'Pay with Alipay': '使用支付宝付款', 'Amount to pay': '应付金额', '1. Open Alipay and scan this QR code.': '1. 打开支付宝,扫描此二维码。',
    '3. In the remark / note box, write this code:': '3. 在备注/留言栏填写此编号:', '4. Tap "I have paid" below.': '4. 付款后,点击下方“我已付款”。',
    'Your Alipay name or last 4 digits of the order number (optional)': '您的支付宝姓名或订单号后 4 位(可选)', 'I have paid': '我已付款',
    'Thank you. We are checking your payment. This page updates by itself, and it usually takes a few hours.': '谢谢!我们正在核对您的付款,本页面会自动更新,通常需要几个小时。',
    'We could not confirm this payment. If you paid, please contact support and quote your code.': '我们未能确认这笔付款。如果您已付款,请联系客服并提供您的付款编号。',
    'Code:': '付款编号:',
    'Workspace': '工作区', 'Help': '帮助', 'Plans & Billing': '套餐与账单', 'Profile': '个人资料',
    'Quick start': '快速开始', 'Recent images': '最近生成的图片', 'See all': '查看全部',
    'Profile photo': '头像', 'Remove photo': '移除头像', 'Images made': '已生成图片', 'Orders': '订单', 'Account summary': '账号概览',
    'Photo ready. Click Save Personal Information to keep it.': '头像已就绪,请点击“保存个人信息”以保留。',
    'Logo & colour': '标志与颜色', 'Brand colour': '品牌颜色', 'Business details': '公司信息', 'Tagline': '标语',
    'Business phone': '公司电话', 'Business email': '公司邮箱', 'Business address': '公司地址', 'Contact details': '联系方式',
    'Certificate signer': '证书签署人', 'Default signer name': '默认签署人姓名', 'Default signer title': '默认签署人职务', 'Default signature': '默认签名',
    'Saved details are filled into new designs automatically.': '已保存的信息会自动填入新设计。',
    'e.g. Creative solutions that grow your brand': '例如:创意方案,助力品牌成长',
    'e.g. +254 700 000 000': '例如:+86 138 0000 0000', 'e.g. info@yourcompany.com': '例如:info@yourcompany.com',
    'e.g. www.yourcompany.com': '例如:www.yourcompany.com', 'e.g. Nairobi, Kenya': '例如:深圳市南山区',
    'e.g. John Otieno': '例如:李明', 'e.g. Director': '例如:总经理',
    'Preferences': '偏好设置', 'Language': '语言', 'Default payment currency': '默认支付币种', 'Saved on this device.': '仅保存在本设备。',
    'Privacy and data': '隐私与数据', 'To delete your account or request a copy of your data, please contact support.': '如需删除账号或获取您的数据副本,请联系客服。', 'Contact support': '联系客服',
    'Billing history': '账单记录', 'Item': '项目', 'Amount': '金额', 'Status': '状态', 'Method': '支付方式', 'No payments yet.': '暂无付款记录。',
    'Completed': '已完成', 'In progress': '处理中', 'Pending': '待处理', 'Failed': '失败', 'Active': '有效', 'Expired': '已过期',
    'Card / M-PESA': '银行卡 / M-PESA', 'Alipay': '支付宝', 'Admin grant': '管理员赠送', 'Free (admin)': '免费(管理员赠送)',
    '‹ Prev': '‹ 上一个', 'Next ›': '下一个 ›', '+ Add another (same details)': '+ 再添加一个(沿用当前信息)', '+ Add another (clear names)': '+ 再添加一个(清空姓名等)',
    'Remove this one': '删除当前这一项', '(untitled)': '(未命名)',
    'Fill in one set of details for each person. Use the buttons to add more people. Everything is made in one go at the end.': '为每个人填写一组信息,点击按钮即可添加更多人员,最后一次性全部生成。',
    'Import many people from a CSV (optional)': '从 CSV 批量导入人员(可选)',
    'Course / programme name': '课程 / 培训项目名称',
    'Duration / credits (optional)': '时长 / 学分(可选)',
    'Description (optional)': '说明(可选)',
    'Registration / accreditation line (optional)': '注册 / 认证说明(可选)',
    'Draw signature': '手写签名',
    'Draw it with your mouse or finger, or upload a photo of a signature on white paper.': '用鼠标或手指手写签名,或上传白纸上签名的照片。',
    'Draw your signature': '手写您的签名',
    'Sign inside the box using your mouse, finger or stylus.': '请用鼠标、手指或触控笔在框内签名。',
    'Clear': '清除', 'Use this signature': '使用此签名', 'Cancel': '取消',
    'Please sign in the box first.': '请先在框内签名。',
    'Signature saved. Click Save Brand Settings to keep it.': '签名已保存,请点击“保存品牌设置”以保留。',
    'Each certificate gets its own certificate ID and QR code automatically when you generate.': '生成时,每张证书都会自动获得唯一的证书编号和二维码。',
    'Logo maker': '标志制作',
    'No logo yet? We can create an emblem from your business name. It updates as you type your name below.': '还没有标志?我们可以根据您的公司名称生成徽章,在下方输入名称时会实时更新。',
    'Bottom text (optional)': '底部文字(可选)', 'Auto, e.g. LTD': '自动识别,例如 LTD',
    'Shield colour': '盾牌颜色', 'Accent colour': '点缀颜色',
    'Leave "Bottom text" empty to detect it automatically from names like "Pinnacle Edge Ltd". Type none for no bottom text.': '“底部文字”留空将自动识别(例如 "Pinnacle Edge Ltd" 中的 LTD)。输入 none 则不显示底部文字。',
    'Use this emblem as my logo': '将此徽章设为我的标志',
    'Could not create the emblem.': '无法生成徽章。',
    'Certificate verification': '证书验证', 'Checking...': '正在查询…', 'Certificate verified': '证书验证通过',
    'This certificate was created on Media Engine by the issuer shown below.': '该证书由下方显示的颁发方通过 Media Engine 创建。',
    'Issued to': '颁发给', 'For': '事由', 'Issued by': '颁发方', 'Certificate ID': '证书编号',
    'Certificate not found': '未找到该证书', 'Check the certificate ID and try again.': '请核对证书编号后重试。',
    'This certificate has been revoked by the issuer.': '该证书已被颁发方撤销。',
    'Check': '查询', 'Enter a certificate ID': '请输入证书编号', 'e.g. PEL-2026-7K3QZ9': '例如:PEL-2026-7K3QZ9',
    'This confirms the certificate was created on Media Engine by the issuer shown. It does not confirm any accreditation or qualification.': '此验证仅确认该证书由所示颁发方在 Media Engine 上创建,并不证明任何认证或资质。',
    'You have reached your upload limit. Please contact support.': '您已达到上传数量上限,请联系客服。',
    'Report a problem with a certificate': '举报证书问题'
  };

  var PATTERNS = [
    [/^Pay per image: (.+) each$/, '按张付费:每张 $1'],
    [/^Pay per image: (\d+) × (.+) =$/, '按张付费:$1 × $2 ='],
    [/^Pay per image: (.+)$/, '按张付费:$1'],
    [/^Pay (.+) and generate$/, '支付 $1 并生成'],
    [/^Generate (\d+) images?$/, '生成 $1 张图片'],
    [/^Use my pass \((\d+) left\)$/, '使用我的套餐(剩余 $1 张)'],
    [/^Your pass has (\d+) left, which is not enough for (\d+)\.$/, '您的套餐仅剩 $1 张额度,不足 $2 张。'],
    [/^Your pass has (\d+) generation\(s\) left but this order needs (\d+)\.$/, '您的套餐仅剩 $1 张额度,但本次订单需要 $2 张。'],
    [/^You can make up to (\d+) images in one order\.$/, '单次订单最多可生成 $1 张图片。'],
    [/^You can keep up to (\d+) saved designs\. Delete one to add another\.$/, '最多可保存 $1 个设计,请删除一个后再添加。'],
    [/^Welcome, (.+)$/, '欢迎,$1'],
    [/^Your (.+) is active\. Create something great today\.$/, '您的$1已生效,开始创作吧。'],
    [/^Your pass expired on (.+)\. Pay per image or choose a new pass\.$/, '您的套餐已于 $1 到期。可按张付费,或选择新套餐。'],
    [/^Your pass ends soon \((.+)\)\.$/, '您的套餐即将到期($1)。'],
    [/^Your pass ends in (\d+) day\(s\)\.$/, '您的套餐将在 $1 天后到期。'],
    [/^Your current pass is active until (.+)\.$/, '您当前的套餐有效期至 $1。'],
    [/^No pass\? You can pay per image instead: (.+) per image, chosen at the last step in the Studio\.$/, '没有套餐?也可以按张付费:每张 $1,在设计室最后一步选择。'],
    [/^about (.+) per image$/, '约 $1 / 张'],
    [/^about \$(\d+)$/, '约 $$1'],
    [/^or about ¥(\d+) via Alipay$/, '或通过支付宝支付约 ¥$1'],
    [/^([\d,]+) images$/, '$1 张图片'],
    [/^Valid for (\d+) days?$/, '有效期 $1 天'],
    [/^Choose (Daily Pass|Weekly Pass|Monthly Pass)$/, '选择$1'],
    [/^(.+) \(until (.+)\)$/, '$1(有效期至 $2)'],
    [/^: (\d+) images$/, ':$1 张图片'],
    [/^Upload a CSV where each row is one image \(up to (\d+)\)\. Column headings:$/, '上传 CSV 文件,每一行对应一张图片(最多 $1 张)。列标题:'],
    [/^Too many rows \(max (\d+)\)\.$/, '行数过多(最多 $1 行)。'],
    [/^All (\d+) images? (?:are|is) ready$/, '全部 $1 张图片已生成'],
    [/^Making your images: (\d+) of (\d+)$/, '正在生成:$1 / $2'],
    [/^Use my brand colour \((.+)\)$/, '使用我的品牌色($1)'],
    [/^Delete "(.+)"\?$/, '删除“$1”?'],
    [/^2\. Pay exactly (.+)\.$/, '2. 请准确支付 $1。'],
    [/^You already have an active pass until (.+)\. You can buy a new pass when it ends\.$/, '您已有一个有效套餐,有效期至 $1。套餐结束后可再购买。'],
    [/^Error: (.+)$/, '错误:$1'],
    [/^Order: (\d+) x (.+)$/, '订单:$1 × $2'],
    [/^Item (\d+) of (\d+)$/, '第 $1 / $2 项'],
    [/^(\d+) items imported\. You can edit each one in step 3\.$/, '已导入 $1 项,可在第 3 步逐项编辑。'],
    [/^This replaces your (\d+) items\. Continue\?$/, '这将替换您现有的 $1 项,是否继续?']
  ];

  var lang = '';
  try { lang = localStorage.getItem('meLang') || ''; } catch (e) {}
  if (lang !== 'zh' && lang !== 'en') lang = (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function tr(s, depth) {
    depth = depth || 0;
    var k = norm(s);
    if (!k) return null;
    if (Object.prototype.hasOwnProperty.call(ZH, k)) return ZH[k];
    if (depth > 2) return null;
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = PATTERNS[i][0].exec(k);
      if (m) {
        return PATTERNS[i][1].replace(/\$(\d)/g, function (_, n) {
          var g = m[+n];
          if (g === undefined) return '';
          var t = tr(g, depth + 1);
          return t === null ? g : t;
        });
      }
    }
    return null;
  }

  function skip(el) {
    if (!el) return true;
    var tag = el.nodeName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'NOSCRIPT') return true;
    return !!(el.closest && el.closest('[translate="no"]'));
  }

  function translateText(n) {
    var raw = n.nodeValue;
    if (n.__zh !== undefined && raw === n.__zh) return;
    if (skip(n.parentNode)) return;
    var t = tr(raw);
    n.__en = raw;
    if (t === null) { n.__zh = undefined; return; }
    var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    n.__zh = lead + t + trail;
    n.nodeValue = n.__zh;
  }

  var ATTRS = ['placeholder', 'title'];
  function translateAttrs(el) {
    if (!el.getAttribute || skip(el)) return;
    ATTRS.forEach(function (a) {
      var raw = el.getAttribute(a);
      if (raw === null) return;
      el.__a = el.__a || {};
      var st = el.__a[a];
      if (st && raw === st.zh) return;
      var t = tr(raw);
      if (t === null) { el.__a[a] = { en: raw, zh: undefined }; return; }
      el.__a[a] = { en: raw, zh: t };
      el.setAttribute(a, t);
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode())) translateText(n);
    translateAttrs(root);
    var els = root.querySelectorAll('[placeholder],[title]');
    for (var i = 0; i < els.length; i++) translateAttrs(els[i]);
  }

  var titleEn = document.title;
  function restore() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode())) {
      if (n.__zh !== undefined && n.nodeValue === n.__zh && n.__en !== undefined) n.nodeValue = n.__en;
    }
    var els = document.querySelectorAll('[placeholder],[title]');
    for (var i = 0; i < els.length; i++) {
      var st = els[i].__a;
      if (!st) continue;
      ATTRS.forEach(function (a) {
        if (st[a] && st[a].zh !== undefined && els[i].getAttribute(a) === st[a].zh) els[i].setAttribute(a, st[a].en);
      });
    }
    document.title = titleEn;
  }

  function apply() {
    if (lang === 'zh') {
      var t = tr(titleEn);
      if (t !== null) document.title = t;
      walk(document.body);
    } else {
      restore();
    }
  }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('translate', 'no');
  var slot = document.getElementById('langSlot');
  btn.style.cssText = (slot ? 'position:static;' : 'position:fixed;top:14px;right:16px;z-index:9999;') +
    'width:auto;display:inline-block;margin:0;padding:8px 16px;' +
    'border:1px solid #e2e4ec;border-radius:20px;background:#fff;color:#2b2d42;font-size:13px;font-weight:700;' +
    'cursor:pointer;box-shadow:0 2px 8px rgba(43,45,66,.12);';
  function label() { btn.textContent = lang === 'zh' ? 'English' : '中文'; }
  function setLang(l) {
    var prev = lang;
    lang = l;
    try { localStorage.setItem('meLang', l); } catch (e) {}
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
    label();
    apply();
    window.dispatchEvent(new CustomEvent('melangchange', { detail: { lang: l, prev: prev } }));
  }
  btn.onclick = function () { setLang(lang === 'zh' ? 'en' : 'zh'); };
  label();
   (slot || document.body).appendChild(btn);

   window.ME_LANG = function () { return lang; };
  window.ME_SETLANG = setLang;
  window.ME_DICT = ZH;
  window.ME_PATTERNS = PATTERNS;
  window.ME_REAPPLY = apply;
  window.ME_T = function (s) { if (lang !== 'zh') return s; var t = tr(s); return t === null ? s : t; };

  var obs = new MutationObserver(function (muts) {
    if (lang !== 'zh') return;
    muts.forEach(function (m) {
      if (m.type === 'childList') {
        for (var i = 0; i < m.addedNodes.length; i++) walk(m.addedNodes[i]);
      } else if (m.type === 'characterData') {
        translateText(m.target);
      } else if (m.type === 'attributes') {
        translateAttrs(m.target);
      }
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  apply();
})();