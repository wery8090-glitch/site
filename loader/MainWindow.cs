using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Media;
using System.Diagnostics;
using System.IO;

namespace Chroma.Loader;

public sealed class MainWindow : Window
{
    private readonly ChromaApiClient api = new();
    private readonly StackPanel login = new() { Width = 410, Spacing = 10 };
    private readonly StackPanel dashboard = new() { IsVisible = false, Spacing = 16 };
    private readonly TextBlock status = new() { Text = "ГОТОВ", Foreground = Brush("#B9D7B3") };
    private readonly TextBlock error = new() { Foreground = Brushes.LightCoral, TextWrapping = TextWrapping.Wrap };
    private readonly TextBox username = new() { Watermark = "Никнейм", MinWidth = 380 };
    private readonly TextBox email = new() { Watermark = "email@example.com", MinWidth = 380 };
    private readonly TextBox password = new() { PasswordChar = '•', Watermark = "Пароль", MinWidth = 380 };
    private readonly CheckBox remember = new() { Content = "Запомнить сессию", IsChecked = true };
    private readonly TextBlock welcome = new();
    private readonly TextBlock plan = new();
    private readonly TextBlock expires = new();
    private readonly ComboBox minecraftVersion = new() { SelectedIndex = 0, Width = 190 };
    private readonly WrapPanel visualCards = new() { Orientation = Orientation.Horizontal };
    private readonly TextBlock release = new();
    private IReadOnlyList<ClientVersion> availableVersions = Array.Empty<ClientVersion>();

    public MainWindow()
    {
        Title = "Chroma Client"; Width = 1120; Height = 740; MinWidth = 900; MinHeight = 620;
        WindowStartupLocation = WindowStartupLocation.CenterScreen; Background = Brush("#0B110F");
        Content = Build(); Opened += async (_, _) => await RestoreAsync();
    }

    private Control Build()
    {
        var root = new Grid { Margin = new Thickness(34), RowDefinitions = new RowDefinitions("Auto,*") };
        var header = new DockPanel { LastChildFill = true };
        header.Children.Add(new TextBlock { Text = "CHROMA CLIENT", FontSize = 22, FontWeight = FontWeight.Bold, Foreground = Brush("#D8F0CF") });
        DockPanel.SetDock(status, Dock.Right); header.Children.Add(status); root.Children.Add(header);
        var content = new Grid { Margin = new Thickness(0, 28, 0, 0), ColumnDefinitions = new ColumnDefinitions("1*,1*") };
        Grid.SetRow(content, 1); root.Children.Add(content);
        login.Children.Add(new TextBlock { Text = "Твой Minecraft. Твой стиль.", FontSize = 36, FontWeight = FontWeight.SemiBold, Foreground = Brush("#F2F5EF"), TextWrapping = TextWrapping.Wrap });
        login.Children.Add(new TextBlock { Text = "Войди в аккаунт Chroma — Loader покажет только реально доступные визуалы и активную подписку.", Foreground = Brush("#9BAF9E"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 4, 0, 16) });
        login.Children.Add(Label("НИКНЕЙМ")); login.Children.Add(username); login.Children.Add(Label("EMAIL")); login.Children.Add(email); login.Children.Add(Label("ПАРОЛЬ")); login.Children.Add(password); login.Children.Add(remember);
        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10 };
        var loginButton = new Button { Content = "ВОЙТИ  →", Height = 46, HorizontalContentAlignment = HorizontalAlignment.Center }; loginButton.Click += async (_, _) => await LoginAsync();
        var registerButton = new Button { Content = "РЕГИСТРАЦИЯ", Height = 46, Background = Brush("#233329"), Foreground = Brush("#D8F0CF") }; registerButton.Click += async (_, _) => await RegisterAsync();
        actions.Children.Add(loginButton); actions.Children.Add(registerButton); login.Children.Add(actions); login.Children.Add(error); Grid.SetColumn(login, 0); content.Children.Add(login);
        var hero = new Border { Margin = new Thickness(46, 0, 0, 0), CornerRadius = new CornerRadius(24), Background = new LinearGradientBrush { StartPoint = new RelativePoint(0, 0, RelativeUnit.Relative), EndPoint = new RelativePoint(1, 1, RelativeUnit.Relative), GradientStops = new GradientStops { new GradientStop(Brush("#274735").Color, 0), new GradientStop(Brush("#111A14").Color, 1) } }, Padding = new Thickness(28), VerticalAlignment = VerticalAlignment.Center, Child = new StackPanel { Spacing = 16, Children = { new TextBlock { Text = "CHROMA VISUALS", FontSize = 13, FontWeight = FontWeight.Bold, Foreground = Brush("#B9D7B3") }, new TextBlock { Text = "Premium visual workspace", FontSize = 28, FontWeight = FontWeight.SemiBold, Foreground = Brush("#F2F5EF"), TextWrapping = TextWrapping.Wrap }, new TextBlock { Text = "Сервер остаётся источником истины: пароль и секретные ключи не сохраняются в Loader.", Foreground = Brush("#C2D0C1"), TextWrapping = TextWrapping.Wrap }, Pill("REAL ACCOUNT SYNC") } } };
        Grid.SetColumn(hero, 1); content.Children.Add(hero); BuildDashboard(content); return root;
    }

    private void BuildDashboard(Grid content)
    {
        dashboard.Children.Add(welcome); welcome.FontSize = 30; welcome.FontWeight = FontWeight.SemiBold; welcome.Foreground = Brush("#F2F5EF");
        dashboard.Children.Add(new TextBlock { Text = "ДОСТУПНЫЕ ВОЗМОЖНОСТИ", Foreground = Brush("#9BAF9E"), FontSize = 11, FontWeight = FontWeight.Bold });
        var account = new Grid { ColumnDefinitions = new ColumnDefinitions("*,*,*") }; AddTile(account, "ПОДПИСКА", plan, 0); AddTile(account, "ОКОНЧАНИЕ", expires, 1); AddTile(account, "MINECRAFT", new TextBlock { Text = "1.21.x", Foreground = Brush("#F2F5EF") }, 2); dashboard.Children.Add(account);
        dashboard.Children.Add(new TextBlock { Text = "ВЫБОР ВЕРСИИ", Foreground = Brush("#B9D7B3"), FontSize = 11, FontWeight = FontWeight.Bold, Margin = new Thickness(0, 8, 0, -5) });
        dashboard.Children.Add(minecraftVersion);
        dashboard.Children.Add(new TextBlock { Text = "ДОСТУПНЫЕ ВИЗУАЛЫ", Foreground = Brush("#B9D7B3"), FontSize = 11, FontWeight = FontWeight.Bold, Margin = new Thickness(0, 8, 0, -5) });
        dashboard.Children.Add(visualCards); release.Foreground = Brush("#9BAF9E"); release.TextWrapping = TextWrapping.Wrap; dashboard.Children.Add(release);
        var play = new Button { Content = "ИГРАТЬ", Height = 52, HorizontalContentAlignment = HorizontalAlignment.Center, Background = Brush("#D8F0CF"), Foreground = Brush("#10150C"), FontSize = 16, FontWeight = FontWeight.Bold }; play.Click += (_, _) => OpenClient();
        var buy = new Button { Content = "ПОЛУЧИТЬ ПОДПИСКУ", Height = 40, Background = Brush("#233329"), Foreground = Brush("#D8F0CF") }; buy.Click += (_, _) => OpenPurchase();
        var logout = new Button { Content = "ВЫЙТИ", Height = 40, Background = Brush("#233329"), Foreground = Brush("#D8F0CF") }; logout.Click += (_, _) => Logout();
        dashboard.Children.Add(play); dashboard.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10, Children = { buy, logout } }); Grid.SetRow(dashboard, 0); Grid.SetColumnSpan(dashboard, 2); content.Children.Add(dashboard);
    }

    private async Task LoadDashboardAsync()
    {
        visualCards.Children.Clear(); status.Text = "СИНХРОНИЗАЦИЯ";
        var visuals = await api.GetVisualsAsync();
        foreach (var visual in visuals) { var card = new Border { Width = 220, Margin = new Thickness(0, 0, 10, 10), Padding = new Thickness(14), Background = Brush("#122019"), BorderBrush = Brush("#2B4533"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(14), Child = new StackPanel { Spacing = 5, Children = { new TextBlock { Text = visual.Slug.Replace('_', ' ').ToUpperInvariant(), Foreground = Brush("#D8F0CF"), FontWeight = FontWeight.Bold }, new TextBlock { Text = visual.Name, Foreground = Brush("#F2F5EF") }, new TextBlock { Text = $"v{visual.Version} • {visual.MinecraftVersion}", Foreground = Brush("#9BAF9E"), FontSize = 11 } } } }; visualCards.Children.Add(card); }
        availableVersions = await api.GetAvailableVersionsAsync();
        minecraftVersion.ItemsSource = availableVersions.Select(version => $"Minecraft {version.MinecraftVersion} • {version.Version}").ToArray();
        minecraftVersion.SelectedIndex = availableVersions.Count > 0 ? 0 : -1;
        var latest = await api.GetLatestReleaseAsync(); release.Text = latest is null ? "Версия Loader: сервер ещё не опубликовал релиз." : $"Последняя версия Loader: {latest.Version} • {latest.MinecraftVersion}"; status.Text = "ONLINE / ГОТОВ";
    }
    private async Task RestoreAsync() { try { status.Text = "ВОССТАНОВЛЕНИЕ СЕССИИ"; var account = await api.RestoreAsync(); if (account is not null) await ShowAsync(account); else status.Text = "ГОТОВ"; } catch { status.Text = "ГОТОВ"; } }
    private async Task LoginAsync() { error.Text = ""; try { status.Text = "ПОДКЛЮЧЕНИЕ"; await ShowAsync(await api.LoginAsync(email.Text?.Trim() ?? "", password.Text ?? "", remember.IsChecked == true)); } catch (Exception ex) { error.Text = ex.Message; status.Text = "ГОТОВ"; } }
    private async Task RegisterAsync() { error.Text = ""; try { status.Text = "СОЗДАНИЕ АККАУНТА"; error.Text = await api.RegisterAsync(username.Text?.Trim() ?? "", email.Text?.Trim() ?? "", password.Text ?? ""); status.Text = "ГОТОВ"; } catch (Exception ex) { error.Text = ex.Message; status.Text = "ГОТОВ"; } }
    private async Task ShowAsync(Account account) { login.IsVisible = false; dashboard.IsVisible = true; welcome.Text = $"Привет, {account.Username}."; plan.Text = account.Plan; expires.Text = account.EndsAt ?? "Нет активной подписки"; await LoadDashboardAsync(); }
    private void Logout() { api.Logout(); dashboard.IsVisible = false; login.IsVisible = true; status.Text = "ГОТОВ"; password.Text = ""; }
    private static void OpenPurchase() { try { Process.Start(new ProcessStartInfo("https://chroma-client-pozetiv.vercel.app/pricing") { UseShellExecute = true }); } catch { } }
    private void OpenClient() { try { if (availableVersions.Count == 0 || minecraftVersion.SelectedIndex < 0) { error.Text = "Не удалось получить информацию о доступной версии."; return; } var client = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Chroma", "ChromaClient.exe"); if (!File.Exists(client)) { error.Text = "Необходим файл клиента Chroma. Сначала установите или обновите клиент."; return; } Process.Start(new ProcessStartInfo(client) { UseShellExecute = true }); } catch { error.Text = "Не удалось запустить Chroma Client."; } }
    private TextBlock Label(string text) => new() { Text = text, Foreground = Brush("#B9D7B3"), FontSize = 11, FontWeight = FontWeight.SemiBold, Margin = new Thickness(0, 8, 0, 0) };
    private static Border Pill(string text) => new() { Background = Brush("#1C3525"), BorderBrush = Brush("#3D6846"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(10, 6), Child = new TextBlock { Text = text, Foreground = Brush("#B9D7B3"), FontSize = 10, FontWeight = FontWeight.Bold } };
    private static void AddTile(Grid grid, string label, TextBlock value, int column) { value.FontSize = 16; value.FontWeight = FontWeight.SemiBold; var border = new Border { Padding = new Thickness(14), Background = Brush("#122019"), BorderBrush = Brush("#2B4533"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(14), Child = new StackPanel { Spacing = 5, Children = { new TextBlock { Text = label, Foreground = Brush("#9BAF9E"), FontSize = 10 }, value } } }; Grid.SetColumn(border, column); grid.Children.Add(border); }
    private static SolidColorBrush Brush(string hex) => new(Color.Parse(hex));
}
