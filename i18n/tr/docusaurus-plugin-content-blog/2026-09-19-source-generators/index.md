---
title: Source generator'lar
authors: [burak]
tags: [dotnet]
---

Bir source generator'ın gerçekte ne yaptığı üzerine notlar — .NET'in kendi, üretimde kullanılan `[GeneratedRegex]`'i somut örnek olarak kullanarak.

{/* truncate */}

## Source generator nedir

Normalde derleyici sadece senin yazdığın kodu derler. Source generator, **derleme sırasında** çalışan, senin kodunu inceleyip bulduklarına göre **ekstra** C# kaynak kodu yazan bir eklenti — bu kod, sen kendin yazmışsın gibi, senin kodunla birlikte derleniyor.

Bunların hepsi program hiç çalışmadan önce oluyor. Uygulaman çalıştığında, üretilmiş kod artık sıradan, zaten derlenmiş bir kod — üretilmesinin çalışma zamanında hiçbir maliyeti yok.

Bunu **reflection** (yansıma) ile karşılaştır — birçok kütüphanenin kullandığı eski yöntem: reflection, kod yapısını **program çalışırken**, her ihtiyaç duyulduğunda inceler. Source generator ise bu incelemeyi bir kere, derleme zamanında yapar ve cevabı doğrudan binary'nin içine gömer.

## Gerçek bir örnek: `[GeneratedRegex]`

```csharp
partial class Program
{
    [GeneratedRegex(@"\d+")]
    private static partial Regex GeneratedNumberRegex();
}
```

Metodun gövdesi yok — `;` ile bitiyor. Bunu iki şey mümkün kılıyor:

- `partial`, "bu metodun bir kısmı başka bir yerde tanımlı" demek.
- `[GeneratedRegex(...)]`, generator'a "o başka yer" için ne üreteceğini söyleyen talimat.

Generator, eksik gövdeyi ayrı bir dosyaya yazıyor — `EmitCompilerGeneratedFiles` açıldığında `obj/` altında bulunabiliyor:

```csharp
private static partial Regex GeneratedNumberRegex()
    => global::System.Text.RegularExpressions.Generated.GeneratedNumberRegex_0.Instance;
```

Ayrıca tam bir özel `Regex` alt sınıfı üretiyor — o pattern için elle yazılmış gibi eşleştirme mantığıyla; genel amaçlı bir yorumlayıcı değil, `\d+`'ye özel kod.

## Farkı ölçmek

Saf karşılaştırma (döngüden önce bir `Regex` örneği oluşturup 200.000 kere yeniden kullanmak) neredeyse hiç fark göstermedi — çünkü pahalı kısım (pattern'i parse etmek) her iki yöntemde de sadece bir kere oluyordu. Asıl maliyet, oluşturma cache'lenmediğinde ortaya çıkıyor:

```
--- new Regex(...) her iterasyonda yeniden oluşturuluyor ---
Süre: 217ms

--- GeneratedNumberRegex() — zaten derleme zamanında hazır ---
Süre: 24ms
```

Döngü içindeki `new Regex(@"\d+")`, pattern'i 200.000 kere baştan parse ediyor. `GeneratedNumberRegex()` ise sadece cache'lenmiş bir singleton döndürüyor — "pattern'i parse et" işi tam olarak bir kere, derleme zamanında oldu, çalışma zamanında hiç olmadı.

## Çıkarım

Bir source generator, "her ihtiyaç duyulduğunda yeniden çöz" işini "program başlamadan önce, bir kere çöz"e çeviriyor. Kazanç, zaten cache'lenmiş bir şey için ham çağrı hızı değil — baştaki maliyeti tamamen ortadan kaldırması. Bu en çok, tek seferlik ya da nadiren tekrar kullanılan işlerde, ve çalışma zamanında kod üretiminin hiç mümkün olmadığı Native AOT senaryolarında önem kazanıyor.
