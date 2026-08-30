---
title: C#'ta async/await
authors: [burak]
tags: [dotnet, async]
---

C#'ta `async`/`await`'in gerçekte nasıl çalıştığına dair notlar — "kodu
non-blocking yapar" açıklamasının ötesinde.

{/* truncate */}

## State machine

`async` metotlar bir state machine'e derlenir. Her `await`, potansiyel bir
askıya alma noktasıdır: beklenen task henüz tamamlanmadıysa, metot kontrolü
hemen çağırana geri döndürür; metodun geri kalanı, task tamamlandığında bir
continuation olarak daha sonra çalışır.

Bu, `async`'in kendi başına yeni bir thread oluşturmadığı anlamına gelir —
mesele beklerken mevcut thread'i *bloklamamak*, paralellik değil.

## `Task` vs `Task<T>` vs `void`

- `Task` / `Task<T>` — normal durum. Çağıranlar `await` edebilir,
  exception'ları gözlemleyebilir ve `Task.WhenAll` / `Task.WhenAny` ile
  birleştirebilir.
- `async void` — fire-and-forget. İçeride fırlatılan exception'lar çağıran
  tarafından yakalanamaz (`SynchronizationContext` üzerinde ortaya çıkar
  ya da process'i çökertir). Yalnızca en üst seviye event handler'lar için
  kabul edilebilir.

## Exception'lar

Bir `async` metot içinde fırlatılan exception yakalanır ve dönen `Task`
await edildiğinde yeniden fırlatılır — metot çağrıldığında değil. Bir
task'ı iki kez await edin (ya da `Task.Exception` üzerinden) ve exception
tekrar gözlemlenir.

```csharp
async Task<int> DivideAsync(int a, int b)
{
    await Task.Delay(10); // denetimi bırakır
    return a / b; // b == 0 ise DivideByZeroException fırlatır
}

try
{
    await DivideAsync(1, 0);
}
catch (DivideByZeroException)
{
    // burada, await noktasında yakalanır — çağrı noktasında değil
}
```

## `ConfigureAwait(false)`

Kütüphane kodunda (ASP.NET Core hariç — onda `SynchronizationContext` yok),
`ConfigureAwait(false)` continuation'a orijinal context'te devam etmesi
gerekmediğini söyler. Modern ASP.NET Core'da bunun çoğunlukla önemi yok,
ama UI uygulamalarında ve her iki ortamda da çalışabilecek paylaşılan
kütüphane kodunda hâlâ önemli.

## Deadlock tuzağı

Yakalanmış bir `SynchronizationContext`'e sahip bir context'ten (klasik
ASP.NET, WPF, WinForms) `.Result` veya `.Wait()` ile async kodu bloklamak
deadlock'a yol açabilir: continuation devam etmek için o context'e ihtiyaç
duyar, ama context'in sahibi olan thread task'ı beklerken bloklanmıştır.
Baştan sona `async` kullanmak bunu önler.

## Özet

- `await`, beklerken thread'i serbest bırakır; yeni bir thread anlamına
  gelmez.
- `async void`'i event handler'lar dışında asla kullanma.
- Exception'lar çağrıda değil, `await` noktasında ortaya çıkar.
- Bloklayan çağrıları (`.Result`, `.Wait()`) async kodla karıştırma.
